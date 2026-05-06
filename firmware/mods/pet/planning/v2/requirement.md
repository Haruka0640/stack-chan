スタックチャンMODのリアクション処理を、今後のトリガ追加に耐えられる構成へリファクタしてください。

目的:
- 感情パラメータ方式は廃止する
- 入力ごとに直接表情を変える実装も避ける
- 「イベント → リアクション選択 → 演出更新」の3層に分ける
- 今後、タッチ・スワイプ・音・IMU・近接センサーなどを追加しやすくする

要件:

1. EventType を作成する

最低限、以下を用意してください。

enum EventType {
  EVENT_NONE,
  EVENT_TAP,
  EVENT_SWIPE,
  EVENT_LONG_PRESS,
  EVENT_LOUD_SOUND,
  EVENT_IDLE_TIMEOUT
};

今後追加しやすいように、入力デバイス名ではなく「起きた出来事」として命名してください。

2. ReactionType を作成する

最低限、以下を用意してください。

enum ReactionType {
  REACTION_IDLE,
  REACTION_SURPRISED,
  REACTION_SLEEPY
};

将来的に以下のようなリアクションを追加できる構成にしてください。

- REACTION_HAPPY
- REACTION_CURIOUS
- REACTION_BLINK
- REACTION_LOOK_AROUND

3. Event 構造体を作成する

struct Event {
  EventType type;
  unsigned long timestamp;
};

4. Reaction 構造体を作成する

struct Reaction {
  ReactionType type;
  int priority;
  unsigned long startedAt;
  unsigned long duration;
};

5. イベントキューを導入する

入力処理から直接リアクションを実行せず、必ずイベントキューに積んでください。

例:

pushEvent(EVENT_TAP);
pushEvent(EVENT_SWIPE);
pushEvent(EVENT_LOUD_SOUND);

6. メインループ構成を以下に寄せる

void loop() {
  M5.update();

  pollInputs();
  processEventQueue();
  updateReaction();
  renderFace();
  renderTouchRipple();

  delay(16);
}

既存のサーボ処理や音処理がある場合は、updateReaction または render 系から呼び出してください。

7. pollInputs()

画面操作・音量検知・時間経過を監視してイベントを発火してください。

現時点の仕様:

- タップ → EVENT_TAP
- スワイプ → EVENT_SWIPE
- 大きい音 → EVENT_LOUD_SOUND
- 一定時間無操作 → EVENT_IDLE_TIMEOUT

lastInteractionAt を持ち、タップ・スワイプ・音などのユーザー刺激があったら更新してください。

8. processEventQueue()

イベントを1件ずつ処理し、必要に応じてリアクションを開始してください。

イベントとリアクションの対応:

- EVENT_TAP → REACTION_SURPRISED
- EVENT_LOUD_SOUND → REACTION_SURPRISED
- EVENT_SWIPE → REACTION_SLEEPY
- EVENT_IDLE_TIMEOUT → REACTION_SLEEPY

9. 優先度ルール

リアクションには優先度を持たせてください。

推奨値:

- REACTION_SURPRISED: 100
- REACTION_SLEEPY: 10
- REACTION_IDLE: 0

新しいリアクションを開始する時は、現在のリアクションより優先度が高い場合のみ上書きしてください。

ただし、現在のリアクションが終了済みなら優先度に関係なく開始してよいです。

10. リアクション時間

推奨値:

- REACTION_SURPRISED: 1500ms
- REACTION_SLEEPY: 3000ms
- REACTION_IDLE: 0ms

SURPRISED は時間経過で IDLE に戻してください。
SLEEPY も時間経過で IDLE に戻してください。

11. スワイプ仕様

スワイプは「だんだん眠くなる」リアクションとして扱ってください。

最初は以下で構いません。

- EVENT_SWIPE 発火
- REACTION_SLEEPY 開始
- renderFace() 内で経過時間に応じて目を少しずつ閉じる
- duration 終了後に REACTION_IDLE に戻る

12. 放置仕様

何もしない状態が一定時間続いたら EVENT_IDLE_TIMEOUT を発火してください。

推奨値:

- idleTimeoutMs = 10000

ただし、毎フレーム EVENT_IDLE_TIMEOUT を積まないようにしてください。
一度発火したら、何らかのユーザー刺激があるまで再発火しないようにしてください。

例:

bool idleEventFired = false;

ユーザー刺激あり:
  lastInteractionAt = millis();
  idleEventFired = false;

放置時間超過:
  if (!idleEventFired) {
    pushEvent(EVENT_IDLE_TIMEOUT);
    idleEventFired = true;
  }

13. 表情描画

renderFace() は currentReaction.type を見て描画してください。

- REACTION_IDLE → 真顔
- REACTION_SURPRISED → びっくり顔
- REACTION_SLEEPY → 眠そうな顔

REACTION_SLEEPY は、経過時間 progress を使って段階的に目を閉じるようにしてください。

例:

float progress = (millis() - currentReaction.startedAt) / currentReaction.duration;

progress:
  0.0 → 通常に近い
  0.5 → 半目
  1.0 → 眠そう

14. 音・サーボ

このリファクタでは、音やサーボは必須ではありません。
既存実装がある場合のみ、リアクション開始時に呼び出してください。

例:

startReaction(REACTION_SURPRISED)
  -> playSurprisedSound()
  -> motionSurprised()

startReaction(REACTION_SLEEPY)
  -> motionSleepy()

15. 既存の感情パラメータを削除する

以下のような値がある場合は廃止してください。

- happiness
- loneliness
- sleepiness
- affection

今後は永続的な感情値ではなく、現在再生中のリアクションだけを持つ方針にします。

16. 拡張しやすい関数構成にする

最低限、以下の関数を用意してください。

void pushEvent(EventType type);
void pollInputs();
void processEventQueue();

Reaction makeReaction(ReactionType type);
void startReaction(ReactionType type);
void updateReaction();

int getReactionPriority(ReactionType type);
unsigned long getReactionDuration(ReactionType type);

void renderFace();
void renderTouchRipple();

bool isUserStimulus(EventType type);

17. 注意点

- 入力処理から直接 setFaceSurprised() などを呼ばないでください
- 入力処理は必ず pushEvent() までにしてください
- 表情描画は renderFace() に集約してください
- currentReaction が唯一のリアクション状態になるようにしてください
- 感情値や寂しさの蓄積は実装しないでください

最終的に、以下の流れになるようにしてください。

入力検知
  ↓
pushEvent()
  ↓
processEventQueue()
  ↓
startReaction()
  ↓
updateReaction()
  ↓
renderFace()
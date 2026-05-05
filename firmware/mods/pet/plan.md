# 実装指示書：画面を撫でるペット・スタックチャン

## 1. 目的

LLMを使わず、CoreS3単体で動く「ペットのようなスタックチャン」を実装する。

初期版では物理的な頭部センサーは使わず、**画面スワイプ操作を“撫でる”入力として扱う**。

## 2. MVPの完成条件

以下ができればMVP完了とする。

* 起動すると通常表情で待機する
* 画面を上から下にスワイプすると「撫でられた」と判定する
* 撫でられると、表情・音・サーボ動作で喜ぶ
* 放置時間によって少し寂しそうになる
* 撫でられると機嫌が回復する
* 後から物理タッチセンサー入力に差し替えられる構造にする

## 3. 操作仕様

| 操作      | 意味   | 反応     |
| ------- | ---- | ------ |
| タップ     | つつく  | びくっとする |
| 下方向スワイプ | 撫でる  | 喜ぶ     |
| 左右スワイプ  | くすぐる | 少しはしゃぐ |
| 長押し     | 手を置く | 落ち着く   |

最初は **下方向スワイプのみ実装必須**。
他は余裕があれば実装する。

## 4. 内部状態

以下の状態値を持つ。

```cpp
struct PetState {
  int happiness;    // 0-100 機嫌
  int loneliness;   // 0-100 寂しさ
  int sleepiness;   // 0-100 眠さ
  int affection;    // 0-100 なつき度
  unsigned long lastInteractionAt;
};
```

初期値：

```cpp
happiness = 50;
loneliness = 20;
sleepiness = 10;
affection = 0;
lastInteractionAt = millis();
```

## 5. 状態変化ルール

### 時間経過

5秒ごとに更新する。

```text
loneliness +1
sleepiness +1
happiness -1
```

ただし範囲は必ず `0〜100` に丸める。

### 撫でられた時

```text
happiness +15
loneliness -20
affection +1
sleepiness -5
lastInteractionAt 更新
```

### つつかれた時

```text
surprised反応を再生
happiness -3
```

※ `surprise` は永続状態にしなくてもよい。単発リアクションで扱う。

## 6. 表情仕様

最低限、以下の表情を用意する。

| 状態               | 表情    |
| ---------------- | ----- |
| 通常               | 普通の目  |
| happiness >= 70  | にこにこ  |
| loneliness >= 70 | しょんぼり |
| sleepiness >= 70 | 眠そう   |
| 撫で直後             | 喜び顔   |
| タップ直後            | びっくり顔 |

優先順位：

```text
単発リアクション中
 > 眠い
 > 寂しい
 > ごきげん
 > 通常
```

## 7. 音仕様

最初はビープ音でよい。

| 反応    | 音         |
| ----- | --------- |
| 撫でられた | 高めの短い音を2回 |
| つつかれた | 短く高い音1回   |
| 眠い    | 低めの小さい音   |
| 寂しい   | 控えめな下降音   |

例：

```cpp
playHappySound();
playSurprisedSound();
playSleepySound();
playLonelySound();
```

## 8. サーボ動作仕様

撫でられた時：

```text
少し右に傾く
少し左に傾く
中央へ戻る
```

動きは小さくする。
初期は安全優先で、角度差は±5〜10度程度。

例：

```cpp
void motionHappy() {
  lookRightSmall();
  delay(150);
  lookLeftSmall();
  delay(150);
  lookCenter();
}
```

## 9. 入力処理設計

画面入力は直接リアクション処理に書かない。

必ずイベント化する。

```cpp
enum PetEvent {
  EVENT_NONE,
  EVENT_PET,
  EVENT_POKE,
  EVENT_TICKLE,
  EVENT_HOLD
};
```

画面スワイプで撫で判定したら：

```cpp
dispatchPetEvent(EVENT_PET);
```

将来、頭部タッチセンサーを追加した場合も：

```cpp
dispatchPetEvent(EVENT_PET);
```

に流すだけにする。

## 10. メインループ構成

```cpp
void loop() {
  M5.update();

  PetEvent event = readInput();

  if (event != EVENT_NONE) {
    handlePetEvent(event);
  }

  updatePetStateByTime();

  updateExpression();

  delay(16);
}
```

## 11. 関数分割案

```cpp
PetEvent readInput();

void handlePetEvent(PetEvent event);

void onPet();
void onPoke();
void onTickle();
void onHold();

void updatePetStateByTime();
void updateExpression();

void setFaceNormal();
void setFaceHappy();
void setFaceLonely();
void setFaceSleepy();
void setFaceSurprised();

void playHappySound();
void playSurprisedSound();

void motionHappy();
void motionSurprised();

int clampState(int value);
```

## 12. MVP実装順

### Step 1

画面スワイプ検知を実装する。

### Step 2

`EVENT_PET` を発火できるようにする。

### Step 3

撫でられた時に音を鳴らす。

### Step 4

撫でられた時に表情を変える。

### Step 5

撫でられた時にサーボを少し動かす。

### Step 6

`happiness / loneliness / sleepiness / affection` を追加する。

### Step 7

放置で寂しくなる処理を入れる。

### Step 8

状態に応じて表情を変える。

## 13. 最初に作る体験

最初のゴールはこれ。

```text
画面をなでる
↓
スタックチャンが「きゅっ」と鳴く
↓
にこっとする
↓
少し首を振る
↓
しばらく放っておくと寂しそうになる
↓
またなでると喜ぶ
```

## 14. 将来拡張

### 頭部タッチセンサー追加

画面スワイプと同じ `EVENT_PET` に接続する。

```text
画面スワイプ
頭部タッチ
どちらも EVENT_PET
```

### 音量反応

マイク入力で大きな音を検知したら `EVENT_POKE` または `EVENT_SURPRISE` を発火。

### なつき度

`affection` が高いほど反応を変える。

例：

```text
affection < 20  控えめに喜ぶ
affection < 60  普通に喜ぶ
affection >= 60  大きく喜ぶ
```

### 日常行動

無操作時にランダムで小さな動きをする。

```text
まばたき
首を傾げる
眠そうにする
小さく鳴く
```

## 15. 実装方針

重要なのは、高機能にすることではなく、
**小さな反応を気持ちよく作ること**。

優先順位は以下。

```text
1. 撫でた時の反応がかわいい
2. 動きが安全
3. 状態変化がわかりやすい
4. 後からセンサー追加できる
5. 複雑なAI処理は入れない
```

このMODは、
**「賢いロボット」ではなく「なついてくる電子ペット」**
として作る。

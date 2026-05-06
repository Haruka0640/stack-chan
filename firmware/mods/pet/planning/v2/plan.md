# Pet MOD v2 Task Board

このファイルは `pet` MOD v2 の実装タスクを管理するための作業ボードです。
仕様の正本は `requirement.md` とし、このファイルでは実装順、完了条件、検証結果を追跡します。

## Status Legend

- `[ ]` 未着手
- `[~]` 作業中
- `[x]` 完了
- `[!]` ブロック中、または判断が必要

## Operating Rules

- タスク開始時は対象タスクを `[~]` にし、`Current Focus` に短い作業メモを残す。
- タスク完了時は `[x]` にし、検証内容を `Verification Log` に追記する。
- 入力処理から直接表情・音・サーボを呼ばない。入力は必ずイベントキューに積む。
- 永続的な感情値は追加しない。現在再生中のリアクションだけを状態として持つ。
- リアクションキューは作らない。イベント処理のたびに `currentReaction` を開始または上書き判定する。
- 音・サーボは任意機能として扱い、利用できない環境ではスキップできるようにする。
- 既存のタッチ波紋は表情・リアクション処理から独立した描画フィードバックとして維持する。

## Current Focus

- Status: `[ ]`
- Task: `V2-P8-04`
- Notes: 実装タスクは完了。残りは CoreS3 実機で起動、タップ、スワイプ、放置、再刺激を確認する。

## Milestones

### V2-P0: Planning and Baseline

- [x] `V2-P0-00` v2 タスクボードを作成する。
  - Acceptance: `planning/v2/plan.md` に実装順、完了条件、検証ログ欄がある。
  - Verification: ファイル作成のみ。挙動変更なし。
- [x] `V2-P0-01` 現在の v1 由来実装の削除範囲を確認する。
  - Acceptance: `happiness`, `loneliness`, `sleepiness`, `affection` の参照箇所と削除方針が明確になっている。
  - Verification: `rg "happiness|loneliness|sleepiness|affection" mods/pet` の結果を確認する。
- [x] `V2-P0-02` v2 の責務分割をファイル単位で確定する。
  - Acceptance: `types.ts`, `events.ts`, `reactions.ts`, `gesture-input.ts`, `mod.ts` の役割が整理されている。
  - Verification: 実装前メモを `Implementation Notes` に追記する。

### V2-P1: Core Types and Runtime State

- [x] `V2-P1-01` `EventType` を定義する。
  - Acceptance: `EVENT_NONE`, `EVENT_TAP`, `EVENT_SWIPE`, `EVENT_LONG_PRESS`, `EVENT_LOUD_SOUND`, `EVENT_IDLE_TIMEOUT` が一箇所で定義されている。
  - Verification: 入力デバイス名ではなく「起きた出来事」として命名されていることを確認する。
- [x] `V2-P1-02` `ReactionType` を定義する。
  - Acceptance: `REACTION_IDLE`, `REACTION_SURPRISED`, `REACTION_SLEEPY` が一箇所で定義されている。
  - Verification: 将来 `REACTION_HAPPY`, `REACTION_CURIOUS`, `REACTION_BLINK`, `REACTION_LOOK_AROUND` を追加しやすい構造になっている。
- [x] `V2-P1-03` `Event` と `Reaction` の型を定義する。
  - Acceptance: `Event` は `type`, `timestamp` を持ち、`Reaction` は `type`, `priority`, `startedAt`, `duration` を持つ。
  - Verification: TypeScript の型チェックで利用箇所が通る。
- [x] `V2-P1-04` v2 用 runtime state を作成する。
  - Acceptance: `eventQueue`, `currentReaction`, `lastInteractionAt`, `idleEventFired` を持つ。
  - Verification: v1 の感情値と `reactionQueue` を持たないことを確認する。
- [x] `V2-P1-05` v1 の感情パラメータを削除する。
  - Acceptance: `PetState` から `happiness`, `loneliness`, `sleepiness`, `affection` が消えている。
  - Verification: `rg "happiness|loneliness|sleepiness|affection" mods/pet` で実装コードに残っていない。

### V2-P2: Event Queue

- [x] `V2-P2-01` `pushEvent(EventType type)` を実装する。
  - Acceptance: 現在時刻付きの `Event` がキューに積まれる。
  - Verification: トレースで `EVENT_TAP` などの積み込みが確認できる。
- [x] `V2-P2-02` `isUserStimulus(EventType type)` を実装する。
  - Acceptance: `EVENT_TAP`, `EVENT_SWIPE`, `EVENT_LONG_PRESS`, `EVENT_LOUD_SOUND` がユーザー刺激として扱われる。
  - Verification: 刺激イベントで `lastInteractionAt` 更新と `idleEventFired = false` が行われる。
- [x] `V2-P2-03` `processEventQueue()` を実装する。
  - Acceptance: イベントキューを 1 件ずつ処理し、イベントに応じて `startReaction()` をその場で呼ぶ。
  - Verification: 入力処理からリアクションを直接呼ばず、イベント処理だけが `currentReaction` の開始・上書きを行う。
- [x] `V2-P2-04` イベントとリアクションの対応を実装する。
  - Acceptance: `EVENT_TAP` と `EVENT_LOUD_SOUND` は `REACTION_SURPRISED`、`EVENT_SWIPE` と `EVENT_IDLE_TIMEOUT` は `REACTION_SLEEPY` になる。
  - Verification: 各イベントのトレースで開始リアクションを確認する。

### V2-P3: Reaction Controller

- [x] `V2-P3-01` `getReactionPriority()` を実装する。
  - Acceptance: `SURPRISED = 100`, `SLEEPY = 10`, `IDLE = 0` を返す。
  - Verification: 優先度の定数が一箇所で管理されている。
- [x] `V2-P3-02` `getReactionDuration()` を実装する。
  - Acceptance: `SURPRISED = 1500ms`, `SLEEPY = 3000ms`, `IDLE = 0ms` を返す。
  - Verification: duration の変更がリアクション生成に反映される。
- [x] `V2-P3-03` `makeReaction(ReactionType type)` を実装する。
  - Acceptance: type, priority, startedAt, duration を持つ `Reaction` を生成する。
  - Verification: 開始時刻が現在時刻になる。
- [x] `V2-P3-04` `startReaction(ReactionType type)` を実装する。
  - Acceptance: リアクションをキューに溜めず、現在のリアクションが終了済みなら即座に `currentReaction` を差し替える。未終了なら高優先度のリアクションだけが上書きする。
  - Verification: `SLEEPY` 中の `SURPRISED` は上書きし、`SURPRISED` 中の `SLEEPY` は上書きしない。低優先度リアクションは後で再生されず破棄される。
- [x] `V2-P3-05` `updateReaction()` を実装する。
  - Acceptance: `SURPRISED` と `SLEEPY` は duration 終了後に `REACTION_IDLE` へ戻る。
  - Verification: 時間経過後に `NEUTRAL` 表情へ戻る。

### V2-P4: Input Polling

- [x] `V2-P4-01` `pollInputs()` の入口を作る。
  - Acceptance: 16ms 周期のメイン更新から呼ばれる入力監視関数がある。
  - Verification: 関数が存在し、入力追加時の入口が明確になっている。
- [x] `V2-P4-02` タップ入力を `EVENT_TAP` に変換する。
  - Acceptance: 短距離・短時間のタッチ終了で `pushEvent(EVENT_TAP)` される。
  - Verification: タップで `REACTION_SURPRISED` が開始する。
- [x] `V2-P4-03` スワイプ入力を `EVENT_SWIPE` に変換する。
  - Acceptance: 既存の下方向スワイプ判定が `pushEvent(EVENT_SWIPE)` に接続される。
  - Verification: スワイプで `REACTION_SLEEPY` が開始する。
- [x] `V2-P4-04` 長押し入力を `EVENT_LONG_PRESS` に変換する。
  - Acceptance: 長押しを検出してキューに積む。初期状態ではリアクション未割り当てでもよい。
  - Verification: 長押しイベントのトレースが出る。
- [x] `V2-P4-05` 大きい音イベントの入口を用意する。
  - Acceptance: 音量検知 API が未接続でも `EVENT_LOUD_SOUND` を扱える関数境界がある。
  - Verification: 手動または将来の入力アダプタから `EVENT_LOUD_SOUND` を積める。
- [x] `V2-P4-06` 放置イベントを実装する。
  - Acceptance: 10 秒無操作で `EVENT_IDLE_TIMEOUT` を 1 回だけ積む。
  - Verification: ユーザー刺激があるまで毎フレーム再発火しない。

### V2-P5: Rendering and Effects

- [x] `V2-P5-01` `renderFace()` を実装する。
  - Acceptance: `currentReaction.type` だけを見て表情を選択する。
  - Verification: `REACTION_IDLE` は `NEUTRAL`、`REACTION_SURPRISED` はびっくり相当、`REACTION_SLEEPY` は `SLEEPY` になる。
- [x] `V2-P5-02` `REACTION_SLEEPY` の進行度を計算する。
  - Acceptance: `(now - startedAt) / duration` で `0.0..1.0` の progress を得られる。
  - Verification: 段階的な眠そう表現へ拡張できる形で保持されている。
- [x] `V2-P5-03` 既存 renderer で可能な眠そう表現へ接続する。
  - Acceptance: 初期実装では `robot.setEmotion('SLEEPY')` を使い、必要なら後続で目の開き具合制御を追加できる。
  - Verification: CoreS3 上で眠そうな顔が表示される。
- [x] `V2-P5-04` `renderTouchRipple()` の責務を明確化する。
  - Acceptance: タッチ波紋は既存 `face-view.ts` の描画に任せ、pet MOD 側では表情処理に影響しない。
  - Verification: 波紋表示がイベント・リアクション・サーボに依存していない。

### V2-P6: Main Loop Integration

- [x] `V2-P6-01` `mod.ts` を v2 メインループ構成へ更新する。
  - Acceptance: `pollInputs()`, `processEventQueue()`, `updateReaction()`, `renderFace()`, `renderTouchRipple()` の順で 16ms 周期に実行される。
  - Verification: `Timer.repeat(..., 16)` 相当で実装されている。
- [x] `V2-P6-02` 起動時の安全な初期状態を設定する。
  - Acceptance: 起動直後は `REACTION_IDLE` で `NEUTRAL` 表情になる。
  - Verification: 起動時にサーボの突然の動きがない。
- [x] `V2-P6-03` ログを v2 用に更新する。
  - Acceptance: 感情値ログではなく、イベントキュー・リアクション開始・リアクション終了を追える。
  - Verification: 実機またはビルドログで `pet:` トレースを確認する。

### V2-P7: Optional Sound and Servo Hooks

- [x] `V2-P7-01` `REACTION_SURPRISED` 開始時の音フックを追加する。
  - Acceptance: `robot.tone` がある場合だけ短い高音を鳴らす。
  - Verification: `robot.tone` がない環境でエラーにならない。
- [x] `V2-P7-02` `REACTION_SLEEPY` 開始時のモーションフックを追加する。
  - Acceptance: `robot.setPose` がある場合だけ安全な小さい動きを行う。
  - Verification: サーボ角度が小さく、連続入力で暴れない。
- [x] `V2-P7-03` 音・サーボ処理をリアクション開始時だけに限定する。
  - Acceptance: `renderFace()` や入力処理から音・サーボを直接呼ばない。
  - Verification: 呼び出し経路をコードレビューで確認する。

### V2-P8: Verification

- [x] `V2-P8-01` Biome check を通す。
  - Acceptance: `npx biome check mods/pet` が通る。
  - Verification: コマンド結果を `Verification Log` に追記する。
- [x] `V2-P8-02` MOD ビルドを確認する。
  - Acceptance: `npm run mod -- mods/pet/manifest.json` が TypeScript と XS 変換まで通る。
  - Verification: `xsbug.app` 起動失敗など、既知の GUI 起因失敗は別記する。
- [x] `V2-P8-03` CoreS3 ターゲットビルドを確認する。
  - Acceptance: `npm_config_target=esp32/m5stack_cores3 npm run build` が通る。
  - Verification: コマンド結果を `Verification Log` に追記する。
- [ ] `V2-P8-04` 実機で主要入力を確認する。
  - Acceptance: 起動、タップ、下方向スワイプ、10 秒放置、再刺激後の idle 再発火リセットを確認する。
  - Verification: 実機メモを `Verification Log` に追記する。

## Implementation Notes

- v2 では `PetEvent.PET` のような「解釈済みの行動名」ではなく、`EventType.EVENT_SWIPE` のような「起きた出来事」を扱う。
- キューに積むのは `Event` だけ。`Reaction` は `currentReaction` ひとつだけを持ち、都度開始または上書きする。
- v1 感情値の削除対象: `domain/types.ts` の `PetState`, `domain/state.ts` の state 生成・時間更新・clamp, `domain/events.ts` の `onPet()` 状態更新, `domain/reactions.ts` の感情値による表情選択, `support/log.ts` の感情値ログ。
- v2 のファイル責務: `types.ts` は `EventType`/`ReactionType`/`Event`/`Reaction`/runtime state と robot/touch 型、`events.ts` は event queue と `processEventQueue()`, `reactions.ts` は `currentReaction` の開始・上書き・終了・表情写像、`gesture-input.ts` は touch gesture から `pushEvent()` する入力アダプタ、`mod.ts` は 16ms 周期の実行順を組み立てる。
- 現在の `robot.setEmotion()` で使える表情は `NEUTRAL`, `HAPPY`, `SAD`, `SLEEPY` など。初期の `REACTION_SURPRISED` は既存表情の中から近いものに写像し、必要なら renderer 側で表現を追加する。
- `EVENT_LOUD_SOUND` は requirement 上は必須イベントだが、現時点で pet MOD から使える音量入力 API は未確認。最初はイベント型と処理経路を先に用意し、入力アダプタは後続にする。
- タッチ波紋は `stackchan/renderers-piu/face-view.ts` に既存実装があるため、v2 のリアクション状態に含めない。
- `Timer.repeat(..., 16)` は C++ 例の `delay(16)` 相当として扱う。

## Verification Log

完了した検証を日付、タスク ID、コマンドまたは実機操作、結果の順で記録する。

- 2026-05-06: `V2-P0-00` v2 タスクボードを作成。ファームウェア挙動変更なし。
- 2026-05-06: `V2-P0-01` `rg "happiness|loneliness|sleepiness|affection" firmware/mods/pet` で v1 感情値の残存箇所を確認。実装コードでは `domain/types.ts`, `domain/state.ts`, `domain/events.ts`, `domain/reactions.ts`, `support/log.ts` が削除・置換対象。
- 2026-05-06: `V2-P0-02` v2 のファイル責務を `Implementation Notes` に整理。ファームウェア挙動変更なし。
- 2026-05-06: `V2-P1` `types.ts` と `state.ts` を v2 の `EventType`/`ReactionType`/`Event`/`Reaction`/`PetRuntimeState` に更新。実装コードから v1 感情値を削除。
- 2026-05-06: `V2-P2` `events.ts` に `pushEvent()`, `isUserStimulus()`, `pollInputs()`, `processEventQueue()` を実装。イベントだけをキューに積み、リアクションは `startReaction()` へ即時転送する構成に更新。
- 2026-05-06: `V2-P3` `reactions.ts` を単一 `currentReaction` の優先度上書き方式へ更新。終了済みリアクションは `REACTION_IDLE` に戻る。
- 2026-05-06: `V2-P4` `gesture-input.ts` を `EVENT_TAP`, `EVENT_SWIPE`, `EVENT_LONG_PRESS` 発火へ更新。`EVENT_LOUD_SOUND` は外部入力アダプタから投入可能なイベント経路を用意。
- 2026-05-06: `V2-P5` `renderFace()` を `currentReaction.type` ベースに更新。`SLEEPY` は progress を計算し、初期実装では既存 `SLEEPY` emotion と口の開き具合に接続。
- 2026-05-06: `V2-P6` `mod.ts` を 16ms 周期で `pollInputs()`, `processEventQueue()`, `updateReaction()`, `renderFace()`, `renderTouchRipple()` を呼ぶ構成に更新。
- 2026-05-06: `V2-P8-01` `npx biome check mods/pet` passed. 実行時に `pyenv: cannot rehash: /Users/haruka/.pyenv/shims isn't writable` が表示されたが、Biome 自体は成功。
- 2026-05-06: `V2-P8-02` `npm run mod -- mods/pet/manifest.json` は `tsc`, `xsc`, `xsl pet.xsa` まで成功。最後は既知の `xsbug.app` 起動エラー `kLSNoExecutableErr` で停止。
- 2026-05-06: `V2-P8-03` `npm_config_target=esp32/m5stack_cores3 npm run build` passed.
- 2026-05-06: `V2-P7-01`/`V2-P7-02`/`V2-P7-03` `REACTION_SURPRISED` 開始時の短い高音と、`REACTION_SLEEPY` 開始時の小さい pitch motion を追加。音・サーボは `startReaction()` が受理した時だけ呼ばれる。
- 2026-05-06: `V2-P8-01` `npx biome check mods/pet` passed after P7 changes.
- 2026-05-06: `V2-P8-02` `npm run mod -- mods/pet/manifest.json` は `tsc`, `xsc`, `xsl pet.xsa` まで成功。最後は既知の `xsbug.app` 起動エラー `kLSNoExecutableErr` で停止。
- 2026-05-06: `V2-P8-03` `npm_config_target=esp32/m5stack_cores3 npm run build` passed after P7 changes.

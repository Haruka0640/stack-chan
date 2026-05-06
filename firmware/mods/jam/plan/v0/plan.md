# Session Arp Mode v0 Plan

この計画は `requirement.md` を正本とし、CoreS3 / Moddable 上で安全に実装するための現在方針をまとめる。
進捗管理は `tasks.md` で行う。

## Current Direction

- JAM MOD は drawer toggle で開始/停止する。
- 音源はリアルタイム合成ではなく、`session/loop1.maud` の WAV/MAUD ループ再生を使う。
- 曲データは v0 では BPM、拍子、ループ長、表示タイトルだけを保持する。
- 外部 YAML / LittleFS 読み込みは、実機で安全な配置方法とメモリ余裕を確認してから戻す。
- CoreS3 の XS VM メモリは `stackchan/manifest.json` の `esp32/m5stack_cores3.creation` で Core2 相当に増やす。
- JAM では `posePolling = false` を使い、サーボの read/update を音楽タイミングから外す。
- 首振りは read と ACK 待ちを避け、拍グリッドから低頻度の yaw 書き込みだけを送る。

## Timing Model

- `startedAt` を唯一の時間基準にする。
- 発音時刻は「前回発音時刻 + interval」ではなく、常に `startedAt + gridSlot * gridDuration` から計算する。
- これにより `Timer.repeat()` の揺れや処理遅延を累積させない。
- 音は AudioOut の resource loop に任せ、JS Timer は首振り用の拍位置計算だけに使う。

## Neck Motion Plan

首振りは音楽的には欲しいが、既存サーボドライバは定期的な read/update で `timeout.` を発生させ、音楽タイミングへ影響する。
そのため段階的に実装する。

### Stage 1: Pose Cue Log

- サーボには触らない。
- 拍グリッドから pose cue を生成し、ログだけ出す。
- 初期パターン:
  - beat 1: yaw `-0.08`
  - beat 2: yaw `0.00`
  - beat 3: yaw `0.08`
  - beat 4: yaw `0.00`
- 目的:
  - 音の pattern step と首振り指示が同じ拍基準で出ているか確認する。
  - `timeout.` が出ない状態でタイミングを観察する。

### Stage 2: Low-Frequency Servo Output

- 実装済み。
- ホストに `posePolling` 設定を追加し、JAM 中は `getRotation()` の定期 read を止める。
- `jam:pose` と同じ拍タイミングで `setPose()` を呼び、yaw のみを `-0.08 / 0.00 / 0.08 / 0.00` に動かす。
- 1 回の移動時間は `220ms` とし、同時間内の重複 pose 書き込みを避ける。
- SCServo 検証設定では `enableTilt = false` と `waitForAck = false` を使い、tilt 軸と ACK timeout を音楽タイマーから外す。

### Stage 3: Write-Only Servo Path

- 本命は read を避ける JAM 用の軽量サーボ制御。
- Stage 2 でホストの `setPose()` 経由の write-only 運用を採用した。
- SCServo は driver option で ACK を待たない fire-and-forget 書き込みを選べるようにした。
- さらに timeout が出る場合は、サーボ物理接続、ID、電源、UART port/pin の確認を優先する。

## Verification Focus

- `jam:step` の `late` が累積しないこと。
- `jam:pose` が beat 1/2/3/4 に対応して出ること。
- `posePolling = false` で定期 read による `timeout.` が止まること。
- `waitForAck = false` で pose 書き込み時の `timeout.` が止まり、`jam:step late` が再び小さくなること。

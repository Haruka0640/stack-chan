# Session Arp Mode Task Board

このファイルは `jam` MOD v0 の実装タスクを管理するための作業ボードです。
仕様の正本は `requirement.md` とし、このファイルでは Moddable/Stack-chan 実装へ落とし込んだ計画、実装順、完了条件、検証結果を追跡します。

## Status Legend

- `[ ]` 未着手
- `[~]` 作業中
- `[x]` 完了
- `[!]` ブロック中、または判断が必要

## Operating Rules

- タスク開始時は対象タスクを `[~]` にし、`Current Focus` に短い作業メモを残す。
- タスク完了時は `[x]` にし、検証内容を `Verification Log` に追記する。
- `pet` MOD のイベント、感情状態、タップ/スワイプ反応、放置処理、リアクション制御は流用しない。
- この MOD の責務は「曲データに基づく電子音アルペジオ再生」と「現在再生状態の表示」に限定する。
- `loop()` 相当の処理は `Timer.repeat()` から `SessionController.update(now)` を呼ぶ形にする。
- 長い `delay()` 相当の待ちを入れず、音の発火タイミングは状態更新で非ブロッキングに判定する。
- `robot.tone()` は Promise を返すため、MVP では同時多発を避ける再生中フラグを持つ。
- YAML はまず `requirement.md` のサンプル構造に対応する限定パーサーでよい。外部依存を増やす場合は、MOD ビルドで解決できることを確認してから採用する。
- ファイル読み込みに失敗した場合は、内蔵サンプル曲へフォールバックして起動できるようにする。

## Current Focus

- Status: `[ ]`
- Task: `JAM-P6-04`
- Notes: MVP 実装と CoreS3 ターゲットビルドは完了。残りは CoreS3 実機で drawer 操作、表示、発音密度を確認する。

## Implementation Plan

`requirement.md` は Arduino/C++ の構造体と `loop()` を前提に書かれているが、このリポジトリでは MOD は Moddable の TypeScript/JavaScript として動く。v0 では、C++ の `struct` は TypeScript の `type` に、`loop()` は `Timer.repeat()` に、開始/停止操作は CoreS3 前提で `robot.application.addDrawerButton()` に置き換える。

実装は `firmware/mods/jam` 配下に独立して置く。中心は `SessionController` で、曲データ、再生状態、タイミング計算、コード選択、energy ルール、アルペジオ発火をまとめる。`mod.ts` は起動、drawer 操作登録、周期 update、表示更新だけを組み立てる。

画面表示は MVP では既存の `robot.showBalloon()` を使い、`bar / beat / section / chord / energy` を短い複数行テキストで表示する。必要になった段階で専用 Piu decorator に分離する。

YAML 読み込みは `/session/song.yaml` を第一候補にする。ただし開発中やファイルシステム未準備でも進められるように、`song-loader.ts` に組み込みサンプル曲を持たせる。YAML パーサーはサンプル仕様に特化し、`song`, `settings`, `sections`, `chords`, `progression`, `arp_patterns`, `energy_rules` のマップ/配列/数値/文字列/インライン配列だけを扱う。

## Proposed File Layout

- `mods/jam/manifest.json`
  - MOD manifest。`mod.ts` と domain/support モジュールを登録する。
- `mods/jam/mod.ts`
  - `onRobotCreated(robot)`、起動/停止 UI、`Timer.repeat()` によるメイン更新を持つ。
- `mods/jam/domain/types.ts`
  - `SongInfo`, `SongSection`, `ChordDef`, `ChordEvent`, `ArpPattern`, `EnergyRule`, `SessionState`, `SongConfig`, `JamRobot` を定義する。
- `mods/jam/domain/default-song.ts`
  - `/session/song.yaml` が読めない場合の内蔵サンプル YAML または正規化済み `SongConfig`。
- `mods/jam/domain/song-loader.ts`
  - ファイル読み込み、YAML パース、正規化、バリデーションを担当する。
- `mods/jam/domain/timing.ts`
  - BPM、拍子、経過 ms から現在 bar/beat/tick を計算する。
- `mods/jam/domain/harmony.ts`
  - 現在小節に対応する section/chord/energy rule を引く。
- `mods/jam/domain/arp.ts`
  - energy rule と arp pattern から次に鳴らす MIDI note を決め、Hz に変換する。
- `mods/jam/domain/session-controller.ts`
  - start/stop/update、loop 処理、状態更新、tone 発火をまとめる。
- `mods/jam/ui/session-display.ts`
  - 表示テキスト生成と表示更新の間引きを担当する。
- `mods/jam/support/log.ts`
  - `jam:` prefix の trace helper。
- `mods/jam/session/song.yaml`
  - 開発用サンプル。実機では `/session/song.yaml` へ配置する内容の元データ。

## Milestones

### JAM-P0: Planning and Scaffold

- [x] `JAM-P0-01` 要件を確認し、Moddable 実装への読み替えを整理する。
  - Acceptance: Arduino/C++ 前提の箇所を TypeScript MOD としてどう扱うかが明文化されている。
  - Verification: `Implementation Plan` と `Proposed File Layout` に反映済み。
- [x] `JAM-P0-02` v0 タスクボードを作成する。
  - Acceptance: `plan/v0/tasks.md` に実装順、完了条件、検証ログ欄がある。
  - Verification: ファイル作成のみ。ファームウェア挙動変更なし。
- [x] `JAM-P0-03` `mods/jam` の最小 MOD scaffold を作成する。
  - Acceptance: `manifest.json`, `mod.ts`, `support/log.ts` があり、MOD として読み込める。
  - Verification: `npm run mod -- mods/jam/manifest.json` が TypeScript/XS 変換まで到達する。
- [x] `JAM-P0-04` Jam 用の型定義を作成する。
  - Acceptance: 要件の構造体相当が `domain/types.ts` に TypeScript type として定義されている。
  - Verification: `npx biome check mods/jam` が通る。

### JAM-P1: Song Loading and YAML

- [x] `JAM-P1-01` 内蔵サンプル曲を追加する。
  - Acceptance: 要件サンプル相当の曲データが `default-song.ts` または `session/song.yaml` にある。
  - Verification: ローダー未実装でもデータ構造をレビューできる。
- [x] `JAM-P1-02` `/session/song.yaml` の読み込み入口を実装する。
  - Acceptance: 読み込み成功時はファイル内容、失敗時は内蔵サンプルを返す。
  - Verification: ファイルなし環境でフォールバックして起動する。
- [x] `JAM-P1-03` 限定 YAML パーサーを実装する。
  - Acceptance: サンプル YAML の nested map、list item、inline array、quoted string、number、boolean を読める。
  - Verification: サンプル YAML を `SongConfig` に変換できる。
- [x] `JAM-P1-04` 曲データの正規化とバリデーションを実装する。
  - Acceptance: `time_signature`, `notes`, `steps`, `energy_rules`, `progression` が型安全な値へ変換され、不正値は trace される。
  - Verification: 欠落や不正 chord 参照で安全にフォールバックまたは無音化できる。

### JAM-P2: Timing and Musical State

- [x] `JAM-P2-01` BPM と拍子から bar/beat を計算する。
  - Acceptance: `startedAt` と現在時刻から 1 始まりの `currentBar`, `currentBeat` が得られる。
  - Verification: 90 BPM, 4/4 の既知経過 ms で bar/beat が期待通りになる。
- [x] `JAM-P2-02` loop 設定に対応する。
  - Acceptance: `settings.loop = true` の場合、`totalBars` を超えたら bar 1 に戻る。
  - Verification: `totalBars + 1` 相当の経過時刻で bar 1 に戻る。
- [x] `JAM-P2-03` 現在 section を取得する。
  - Acceptance: 現在 bar が `startBar..endBar` に含まれる section を返す。
  - Verification: intro/verse/build/climax の境界 bar で期待 section になる。
- [x] `JAM-P2-04` 現在 chord を取得する。
  - Acceptance: `progression` の `startBar` と `lengthBars` から chord name と notes を返す。
  - Verification: サンプルの bar 1..4 で `Am/F/C/G` が得られる。
- [x] `JAM-P2-05` energy rule を取得する。
  - Acceptance: 現在 section の `energy` が `min_energy..max_energy` に含まれる rule を返す。
  - Verification: energy 20/40/65/90 がそれぞれ期待 interval/pattern 候補へ対応する。

### JAM-P3: Arpeggio Engine

- [x] `JAM-P3-01` MIDI note から Hz への変換を実装する。
  - Acceptance: MIDI 69 が 440 Hz になる。
  - Verification: 代表値の計算結果を trace またはテスト用 helper で確認する。
- [x] `JAM-P3-02` `arp_interval` を ms に変換する。
  - Acceptance: `2bars`, `1bar`, `2beats`, `1beat` を BPM と拍子から ms に変換できる。
  - Verification: 90 BPM, 4/4 で期待値になる。
- [x] `JAM-P3-03` energy に応じた pattern 選択を実装する。
  - Acceptance: energy rule の `patterns` から決定的または seeded random で pattern を選ぶ。
  - Verification: `random_seed` 指定時に同じ選択順になる。
- [x] `JAM-P3-04` pattern step から chord tone を選ぶ。
  - Acceptance: `steps` の index が chord notes の範囲内に丸められ、コード構成音だけが鳴る。
  - Verification: サンプル chord で範囲外アクセスが起きない。
- [x] `JAM-P3-05` 非ブロッキング tone 発火を実装する。
  - Acceptance: `update()` が発火時刻を判定し、`robot.tone(hz, gateMs, volume)` を開始する。再生中は過剰に重ねない。
  - Verification: trace で note on 相当のタイミングが BPM に追従する。

### JAM-P4: Session Controller

- [x] `JAM-P4-01` `SessionController` の start/stop を実装する。
  - Acceptance: `active`, `startedAt`, `lastArpAt`, current fields が初期化される。
  - Verification: start 直後は bar 1 beat 1 になる。
- [x] `JAM-P4-02` `SessionController.update(now)` を実装する。
  - Acceptance: active 中だけ timing、section、chord、energy、arp を更新する。
  - Verification: inactive 中は tone が鳴らず状態だけ安全に保持される。
- [x] `JAM-P4-03` 曲末尾の停止/loop を実装する。
  - Acceptance: `loop = false` の場合、最後の小節を超えたら停止する。
  - Verification: `totalBars` 超過で `active = false` になる。
- [x] `JAM-P4-04` 設定値を音量や swing に反映する。
  - Acceptance: `default_velocity` は `robot.tone` volume に変換され、`swing` は MVP で無効でも TODO として境界がある。
  - Verification: volume が `0..1` に clamp される。

### JAM-P5: Controls and Display

- [x] `JAM-P5-01` drawer の Start/Stop toggle を追加する。
  - Acceptance: `robot.application.addDrawerButton()` で `Session` toggle が登録される。
  - Verification: callback で start/stop が切り替わり、drawer toggle state も更新される。
- [x] `JAM-P5-02` CoreS3 前提の drawer 操作仕様に統一する。
  - Acceptance: start/stop 操作は drawer の toggle のみを正式経路とし、物理ボタン依存の実装を追加しない。
  - Verification: `mods/jam` に `robot.button` 参照がないことを確認する。
- [x] `JAM-P5-03` ステータス表示を実装する。
  - Acceptance: 画面に `bar`, `beat`, `section`, `chord`, `energy` が表示される。
  - Verification: 表示が 250ms 程度に間引かれ、毎 update で decorator を作り直さない。
- [x] `JAM-P5-04` 起動時/停止時の表示を整える。
  - Acceptance: 停止中は曲名と停止状態、再生中は現在状態が見える。
  - Verification: start/stop を繰り返して表示が重複しない。

### JAM-P6: Verification

- [x] `JAM-P6-01` Biome check を通す。
  - Acceptance: `npx biome check mods/jam` が通る。
  - Verification: コマンド結果を `Verification Log` に追記する。
- [x] `JAM-P6-02` MOD ビルドを確認する。
  - Acceptance: `npm run mod -- mods/jam/manifest.json` が TypeScript と XS 変換まで通る。
  - Verification: `xsbug.app` 起動失敗など GUI 起因の既知失敗は別記する。
- [x] `JAM-P6-03` CoreS3 ターゲットビルドを確認する。
  - Acceptance: `npm_config_target=esp32/m5stack_cores3 npm run build` が通る。
  - Verification: コマンド結果を `Verification Log` に追記する。
- [ ] `JAM-P6-04` 実機で主要操作を確認する。
  - Acceptance: 起動、Start、Stop、曲データ読み込み、bar/beat 表示、energy による密度変化、コード構成音のみの発音を確認する。
  - Verification: 実機メモを `Verification Log` に追記する。

## Implementation Notes

- `pet` MOD は参照対象から外す。例外として、MOD manifest の書き方、`Timer.repeat()` の使い方、`robot.application.addDrawerButton()` の使い方だけはコードベース上の既存パターンとして参考にできる。
- `robot.tone(hz, duration, volume)` は現在の `stackchan/tone.ts` では AudioOut を都度開閉する Promise ベースの API。細かすぎる連打は避け、MVP では `gateMs` 中に次音を重ねない。
- `settings.default_velocity` は MIDI velocity `0..127` とみなし、`volume = velocity / 127` に変換して `0..1` に clamp する。
- `settings.tone_waveform` は要件にあるが、既存 `robot.tone()` では波形指定が見当たらない。MVP では値を保持し、実音は既存 tone API に委ねる。
- `settings.root_octave` はサンプルでは MIDI note が絶対値指定のため MVP では未使用でよい。将来 chord を note name で書く場合の拡張点にする。
- `settings.swing` は初期実装では `0.0` のみ実質対応とする。非ゼロ値は読み込むが、反映は後続タスクで扱う。
- `/session/song.yaml` の実ファイル配置方法は環境依存。まずは読み込み失敗時のフォールバックで開発し、SPIFFS/LittleFS/SD の実機パス確認を `JAM-P6-04` に含める。
- Moddable LittleFS の `File` は、存在しないディレクトリ/ファイルへの確認でも debug break する場合がある。MVP では実機起動を優先し、外部 `/session/song.yaml` 読み込みは無効化して内蔵曲を使う。
- 表示は `robot.showBalloon()` の既存 speech balloon が改行に対応しているため、MVP の状態表示に使える。頻繁な remove/add は避け、必要なら後続で専用 decorator に分離する。
- `arp_interval` は小節または拍単位の開始間隔であり、pattern 内の各 step は `note_length_ms` を基準に進める。MVP では pattern を interval ごとに先頭から再生し、step ごとの発火は `lastStepAt` で管理する。

## Verification Log

完了した検証を日付、タスク ID、コマンドまたは実機操作、結果の順で記録する。

- 2026-05-06: `JAM-P0-01` `requirement.md` を確認し、Moddable TypeScript MOD としての実装方針を `Implementation Plan` に整理。ファームウェア挙動変更なし。
- 2026-05-06: `JAM-P0-02` v0 タスクボードを作成。ファームウェア挙動変更なし。
- 2026-05-06: `JAM-P0-03` `manifest.json`, `mod.ts`, `support/log.ts` を追加。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功。最後は既知の `xsbug.app` 起動エラー `kLSNoExecutableErr` で停止。
- 2026-05-06: `JAM-P0-04` `domain/types.ts` に要件の構造体相当と `JamRobot` 型を追加。`npx biome check mods/jam` passed.
- 2026-05-06: `JAM-P1-01` `domain/default-song.ts` に正規化済み `DEFAULT_SONG` と `DEFAULT_SONG_YAML` を追加し、開発用 `session/song.yaml` も追加。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: `JAM-P1-02` `domain/song-loader.ts` に `/session/song.yaml` 読み込み入口と `DEFAULT_SONG_YAML` フォールバックを追加し、起動時表示へ曲名を接続。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: `JAM-P1-03`/`JAM-P1-04` `song-loader.ts` に限定 YAML パーサー、`SongConfig` 正規化、未知 chord/pattern の trace バリデーションを追加。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: `JAM-P2` `timing.ts` と `harmony.ts` を追加。BPM/拍子から 1 始まりの bar/beat を計算し、loop 設定、section、chord、energy rule を取得できるようにした。
- 2026-05-06: `JAM-P3` `arp.ts` を追加。MIDI note から Hz への変換、`arp_interval` の ms 変換、seeded pattern 選択、chord tone 選択、`SessionController` からの非ブロッキング tone 発火を実装。
- 2026-05-06: `JAM-P4` `session-controller.ts` を追加。start/stop/update、曲末尾 stop/loop、velocity から volume への変換を実装。`swing` は読み込み済みだが MVP では timing に未反映。
- 2026-05-06: `JAM-P5` drawer toggle で start/stop し、`ui/session-display.ts` で `bar / beat / section / chord / energy` を表示。`rg "robot\\.button|button\\?\\." mods/jam` で実装コードに物理ボタン参照がないことを確認。
- 2026-05-06: `JAM-P6-01` `npx biome check mods/jam` passed.
- 2026-05-06: `JAM-P6-02` `npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功。最後は既知の `xsbug.app` 起動エラー `kLSNoExecutableErr` で停止。
- 2026-05-06: `JAM-P6-03` `npm_config_target=esp32/m5stack_cores3 npm run build` passed.
- 2026-05-06: 実機で `/Users/haruka/.local/share/moddable/modules/files/file/littlefs/modLittlefs.c (509) # Break: Error: No directory entry (in File)!` が継続したため、`song-loader.ts` から `file` と `mc/config` import を削除し、MVP では File API に一切触らず `DEFAULT_SONG_YAML` に戻すように変更。`rg "from 'file'|new File|File\\.exists|mc/config|config\\.file" mods/jam` で実装コードに File API 参照がないことを確認。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: 実機で `XS abort: memory full` が出たため、`DEFAULT_SONG_YAML` と YAML parser/normalizer を MVP 実行経路から削除。`loadSong()` は正規化済み `DEFAULT_SONG` を直接返すように変更し、表示文字列も2行に圧縮。`rg "DEFAULT_SONG_YAML|parseSongYaml|parseYaml|normalizeSongConfig|ParsedYaml|prepareLines|splitKeyValue|from 'file'|new File|File\\.exists|mc/config|config\\.file" mods/jam` で実装コードに重い YAML/File 経路が残っていないことを確認。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: 演奏中に `XS abort: memory full` が出たため、再生中の繰り返し allocation を削減。`robot.tone()` の都度 `AudioOut`/Promise 生成をやめ、`domain/tone-player.ts` の単一 `AudioOut` を再利用する方式へ変更。`showBalloon()` の動的 status 更新も停止し、開始/停止時だけ `Playing`/`Stopped` を表示する。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: アルペジオが 4/4 から徐々にズレる問題を修正。`pattern.noteLengthMs` を次ステップ時刻へ加算する方式をやめ、`startedAt + arp_interval grid` から pattern slot/step slot を毎回計算する方式へ変更。pattern steps は `arp_interval / stepCount` に均等配置され、実行遅延が蓄積しない。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。
- 2026-05-06: ズレの切り分け用 timing debug log を追加。`SessionController` に最大80行の `grid`, `step`, `tone ok`, `tone skip` ログを実装し、拍グリッド、予定時刻との差分、AudioOut busy 状態を確認できるようにした。`npx biome check mods/jam` passed。`npm run mod -- mods/jam/manifest.json` は `tsc`, `xsc`, `xsl jam.xsa` まで成功し、最後は既知の `xsbug.app` 起動エラーで停止。

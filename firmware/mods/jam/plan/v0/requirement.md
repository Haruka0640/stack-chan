スタックチャン用の独立MODとして「Session Arp Mode」を実装してください。

目的:
- スタックチャンを、小さな電子音アルペジオ演奏担当として使う
- Sunoなどのボーカル/ラップ音源と、人間のギター演奏に合わせて、コード進行に沿った電子音アルペジオを鳴らす
- リアルタイム音声解析やLLMは使わない
- 曲設定はYAMLファイルで指定できるようにする
- YAMLファイルを差し替えることで、曲・BPM・コード進行・セクション・盛り上がりを変更できるようにする

重要:
- 以前のペットMODの機能・構造・イベント設計は使わない
- 感情リアクション、PET状態、タップ反応、スワイプ反応、放置処理などは実装しない
- このMODは「曲データに基づいて電子音アルペジオを再生する」ことに集中する

MVP完成条件:
- YAMLファイルから曲設定を読み込める
- BPMに基づいて現在小節・拍を計算できる
- 現在小節に対応するコードを取得できる
- 現在セクションの energy に応じてアルペジオ密度を変えられる
- コード構成音だけを使って電子音アルペジオを鳴らせる
- 画面操作またはボタン操作で開始/停止できる
- 画面に現在の bar / beat / section / chord / energy を表示できる

対象環境:
- M5Stack CoreS3
- PlatformIO / Arduino想定
- YAMLファイルはSDカードまたはSPIFFS/LittleFSから読み込む
- まずは /session/song.yaml を読み込む想定でよい

実装方針:
- SessionController のような独立した制御クラスまたはモジュールにまとめる
- loop() から updateSession() を呼ぶ
- delay()で長く止めない
- 可能な限り非ブロッキングでアルペジオを鳴らす
- ただしMVPでは多少簡易実装でもよい

必要なデータ構造:

struct SongInfo {
  String title;
  int bpm;
  int timeSignatureNumerator;
  int timeSignatureDenominator;
  int totalBars;
};

struct SongSection {
  String name;
  int startBar;
  int endBar;
  int energy; // 0-100
};

struct ChordDef {
  String name;
  int notes[8];   // MIDI note numbers
  int noteCount;
};

struct ChordEvent {
  int startBar;
  int lengthBars;
  String chordName;
};

struct ArpPattern {
  String name;
  int steps[16];      // chord tone index
  int stepCount;
  int noteLengthMs;
  int gateMs;
};

struct SessionState {
  bool active;
  unsigned long startedAt;
  int currentBar;
  int currentBeat;
  int currentSectionIndex;
  String currentChordName;
  unsigned long lastArpAt;
};

YAML仕様:

- song: 曲全体の基本情報
- sections: セクション定義
- chords: コード名と構成音
- progression: 小節ごとのコード進行
- arp_patterns: アルペジオパターン
- energy_rules: energyに応じた発火間隔・使用パターン
- settings: 再生時の細かい設定

YAMLサンプル:

```yaml
song:
  title: "Loop Rap Session"
  bpm: 90
  time_signature: "4/4"
  total_bars: 24

settings:
  root_octave: 4
  default_velocity: 80
  tone_waveform: "square"
  swing: 0.0
  random_seed: 0
  loop: true

sections:
  - name: "intro"
    start_bar: 1
    end_bar: 4
    energy: 20

  - name: "verse"
    start_bar: 5
    end_bar: 12
    energy: 40

  - name: "build"
    start_bar: 13
    end_bar: 16
    energy: 65

  - name: "climax"
    start_bar: 17
    end_bar: 24
    energy: 90

chords:
  Am:
    notes: [57, 60, 64, 69]
  F:
    notes: [53, 57, 60, 65]
  C:
    notes: [60, 64, 67, 72]
  G:
    notes: [55, 59, 62, 67]

progression:
  - start_bar: 1
    length_bars: 1
    chord: "Am"

  - start_bar: 2
    length_bars: 1
    chord: "F"

  - start_bar: 3
    length_bars: 1
    chord: "C"

  - start_bar: 4
    length_bars: 1
    chord: "G"

arp_patterns:
  sparse:
    steps: [0, 2]
    note_length_ms: 180
    gate_ms: 120

  basic:
    steps: [0, 1, 2, 1]
    note_length_ms: 160
    gate_ms: 100

  up:
    steps: [0, 1, 2, 3]
    note_length_ms: 120
    gate_ms: 80

  excited:
    steps: [0, 1, 2, 3, 2, 1, 2, 3]
    note_length_ms: 90
    gate_ms: 60

energy_rules:
  - min_energy: 0
    max_energy: 29
    arp_interval: "2bars"
    patterns: ["sparse"]

  - min_energy: 30
    max_energy: 59
    arp_interval: "1bar"
    patterns: ["sparse", "basic"]

  - min_energy: 60
    max_energy: 79
    arp_interval: "2beats"
    patterns: ["basic", "up"]

  - min_energy: 80
    max_energy: 100
    arp_interval: "1beat"
    patterns: ["up", "excited"]
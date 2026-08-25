import type { Messages } from "./Messages";

export default {
  common: {
    cancel: "キャンセル",
    create: "作成",
    rename: "変更",
    delete: "削除",
    add: "追加",
    save: "保存",
    nameLabel: "名前",
    commentLabel: "コメント",
    typeLabel: "種類",
    invalidNameShapeHint:
      "英字またはアンダースコアで始まり、英数字とアンダースコアのみを使用してください。",
    reservedNameHint: "この名前はSQLの予約語のため使用できません。",
    duplicateTableName: "同じ名前のテーブルが既に存在します。",
    duplicateColumnName: "同じ名前のカラムが既に存在します。",
  },
  toolbar: {
    renameSchemaAriaLabel: "スキーマ名を変更",
    deleteSchemaAriaLabel: "スキーマを削除",
    undo: "元に戻す",
    redo: "やり直す",
    autoAlignAriaLabel: "テーブルを自動整列",
    addTable: "テーブルを追加",
    exportSql: "SQLを出力",
    downloadJson: "JSONをダウンロード",
    themeAriaLabel: "テーマ: {theme}",
    localeAriaLabel: "言語: {locale}",
    toggleSidePanelAriaLabel: "サイドパネルの表示切り替え",
    toggleColumnDetailsAriaLabel: "列の型・サイズの表示切り替え",
    toggleSnapToGridAriaLabel: "グリッドへのスナップの切り替え",
    settingsAriaLabel: "設定",
  },
  schemaMenu: {
    ariaLabel: "スキーマ一覧",
    newSchema: "+ 新規スキーマ",
  },
  localeMenu: {
    ariaLabel: "言語",
  },
  loadSchema: {
    buttonLabel: "JSONを読み込む",
    fileInputAriaLabel: "スキーマファイルを読み込む",
    couldNotLoadFile:
      "スキーマファイルを読み込めませんでした。有効なスキーマファイルではありません。",
    dialogTitle: "スキーマを読み込む",
    confirmMessage: "現在のスキーマを「{name}」に置き換えますか? この操作は取り消せません。",
    confirmLabel: "読み込む",
  },
  schemaDialog: {
    newTitle: "新規スキーマ",
    renameTitle: "スキーマ名を変更",
    deleteTitle: "スキーマを削除",
    deleteConfirmMessage: "「{name}」を削除しますか? この操作は取り消せません。",
    fieldLabel: "スキーマ名",
    dialectLabel: "方言",
  },
  tableDialog: {
    newTitle: "新規テーブル",
    deleteTitle: "テーブルを削除",
    deleteConfirmMessage:
      "「{name}」を削除しますか? すべてのカラムとキーも削除されます。この操作は取り消せません。",
    deleteTitleMultiple: "テーブルを削除",
    deleteConfirmMessageMultiple:
      "選択した{count}件のテーブルを削除しますか? すべてのカラムとキーも削除されます。この操作は取り消せません。",
    fieldLabel: "テーブル名",
  },
  columnDialog: {
    addTitle: "カラムを追加",
    editTitle: "カラムを編集",
    deleteTitle: "カラムを削除",
    deleteConfirmMessage: "カラム「{name}」を削除しますか? この操作は取り消せません。",
    keyMembershipCheckboxLabels: {
      PRIMARY_KEY: "主キー",
      UNIQUE: "一意制約",
      INDEX: "インデックス",
    },
    keyMembershipDisabledHint: {
      CONFLICTING_PRIMARY_KEY: "他のキーが既にこのテーブルの主キーです。",
      PART_OF_COMPOSITE_KEY: "このカラムは複合キーの一部です。Keysセクションから管理してください。",
      REFERENCED_BY_FOREIGN_KEY:
        "このカラムは他のテーブルの外部キーから参照されています。先にそのリレーションを削除してください。",
    },
    sizeLabel: "サイズ",
    sizeNotApplicableHint: "このカラム型にはサイズを指定できません。",
    sizeInvalidFormatHint:
      "サイズは正の整数で指定してください(NUMERICの場合は10,2のような精度とスケールの組み合わせも指定できます。スケールは精度以下である必要があります)。",
    precisionLabel: "精度",
    precisionNotApplicableHint: "このカラム型には精度を指定できません。",
    precisionInvalidFormatHint: "精度は0から6までの整数で指定してください。",
    defaultValueLabel: "デフォルト値",
    defaultValueNotApplicableHint: "自動採番のカラムにはデフォルト値を設定できません。",
    defaultValueInvalidFormatHint: "このデフォルト値はこのカラムの型に対して無効です。",
    nullableLabel: "NULL許可",
    autoIncrementLabel: "自動採番",
    autoIncrementHint: "このカラムがテーブル唯一の{types}型の主キーである場合のみ使用できます。",
  },
  keyDialog: {
    addTitle: "キーを追加",
    editTitle: "キーを編集",
    deleteTitle: "キーを削除",
    deleteConfirmMessage: "キー「{label}」を削除しますか? この操作は取り消せません。",
    deleteConfirmMessageReferenced:
      "キー「{label}」を削除しますか? 他のテーブルの外部キーがこのキーを参照しているため、そのリレーションも削除されます。この操作は取り消せません。",
    columnsLegend: "カラム",
    moveColumnUp: "{column}を上に移動",
    moveColumnDown: "{column}を下に移動",
    referencedKeyEditBlockedHint:
      "他のテーブルの外部キーがこのキーを参照しています。同じカラムの単一カラムのPRIMARY KEYまたはUNIQUEキーのままにする必要があります。",
    duplicateIndexHint:
      "このテーブルの別のINDEXキーが、同じ順序で同じカラムをすでに対象にしています。",
  },
  relationDialog: {
    deleteTitle: "リレーションを削除",
    deleteConfirmMessage: "リレーション「{label}」を削除しますか? この操作は取り消せません。",
  },
  sidePanel: {
    schemaHeading: "スキーマ",
    dialectLabel: "方言",
    tablesLabel: "テーブル数",
    createdLabel: "作成日",
    multipleTablesSelectedHeading: "{count} 件のテーブルを選択中",
    tableHeading: "テーブル",
    deleteTableAriaLabel: "テーブルを削除",
    columnsHeading: "カラム",
    addColumn: "カラムを追加",
    editColumnAriaLabel: "カラム {name} を編集",
    deleteColumnAriaLabel: "カラム {name} を削除",
    moveColumnUpAriaLabel: "{name} を上に移動",
    moveColumnDownAriaLabel: "{name} を下に移動",
    keysHeading: "キー",
    addKey: "キーを追加",
    editKeyAriaLabel: "キー {label} を編集",
    deleteKeyAriaLabel: "キー {label} を削除",
    relationsHeading: "リレーション",
    deleteRelationAriaLabel: "リレーション {label} を削除",
  },
  exportSql: {
    title: "SQLを出力",
    noPrimaryKeyHeading: "主キーのないテーブル:",
    generatedSqlAriaLabel: "生成されたSQL",
    noTablesMessage: "出力するテーブルがありません。",
    downloadSql: ".sqlをダウンロード",
    copyToClipboard: "クリップボードにコピー",
    copied: "コピーしました",
    close: "閉じる",
  },
  notificationBar: {
    dismissAriaLabel: "通知を閉じる",
  },
  notifications: {
    couldNotSave:
      "変更を保存できませんでした。このページを離れると変更が失われる可能性があります。",
    couldNotLoadSelected:
      "選択したスキーマを読み込めませんでした。削除されたか、破損している可能性があります。",
    couldNotLoadNamed:
      "「{name}」を読み込めませんでした。削除されたか、破損している可能性があります。",
  },
  tableNode: {
    ariaLabel: "テーブル {name}",
    dropHint: "ドロップしてカラムに接続するか、ここにドロップして新しいカラムを追加",
    sourceHandleTitle: "ここからドラッグして別のテーブルのカラムに接続",
    targetHandleTitle:
      "キー列 — ここに接続をドロップするか、ここからドラッグして別のテーブルに連携するカラムを作成",
  },
  notFound: {
    heading: "404 Not Found",
    body: "お探しのページは見つかりませんでした。",
  },
  settings: {
    heading: "設定",
    backLinkLabel: "エディタに戻る",
    foreignKeysCategoryHeading: "外部キー",
    namingPatternLegend: "子カラムの命名パターン",
    namingPatternTableColumnLabel: "テーブル名 + 参照先カラム名",
    namingPatternTableColumnExample: "例: users_id",
    namingPatternTableIdLabel: "テーブル名 + 「id」",
    namingPatternTableIdExample: "例: users_id",
  },
} satisfies Messages;

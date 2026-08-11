export type Messages = {
  common: {
    cancel: string;
    create: string;
    rename: string;
    delete: string;
    add: string;
    save: string;
    nameLabel: string;
    commentLabel: string;
    typeLabel: string;
    invalidNameShapeHint: string;
    reservedNameHint: string;
    duplicateTableName: string;
    duplicateColumnName: string;
  };
  toolbar: {
    renameSchemaAriaLabel: string;
    deleteSchemaAriaLabel: string;
    undo: string;
    redo: string;
    autoAlignAriaLabel: string;
    addTable: string;
    exportSql: string;
    downloadJson: string;
    /** ICU placeholder: {theme} */
    themeAriaLabel: string;
    /** ICU placeholder: {locale} */
    localeAriaLabel: string;
    toggleSidePanelAriaLabel: string;
    toggleColumnDetailsAriaLabel: string;
    toggleSnapToGridAriaLabel: string;
    settingsAriaLabel: string;
  };
  schemaMenu: {
    ariaLabel: string;
    newSchema: string;
  };
  localeMenu: {
    ariaLabel: string;
  };
  loadSchema: {
    buttonLabel: string;
    fileInputAriaLabel: string;
    couldNotLoadFile: string;
    dialogTitle: string;
    /** ICU placeholder: {name} */
    confirmMessage: string;
    confirmLabel: string;
  };
  schemaDialog: {
    newTitle: string;
    renameTitle: string;
    deleteTitle: string;
    /** ICU placeholder: {name} */
    deleteConfirmMessage: string;
    fieldLabel: string;
  };
  tableDialog: {
    newTitle: string;
    deleteTitle: string;
    /** ICU placeholder: {name} */
    deleteConfirmMessage: string;
    fieldLabel: string;
  };
  columnDialog: {
    addTitle: string;
    editTitle: string;
    deleteTitle: string;
    /** ICU placeholder: {name} */
    deleteConfirmMessage: string;
    keyMembershipCheckboxLabels: {
      PRIMARY_KEY: string;
      UNIQUE: string;
      INDEX: string;
    };
    keyMembershipDisabledHint: {
      PRIMARY_KEY: string;
      UNIQUE: string;
      INDEX: string;
    };
    sizeLabel: string;
    defaultValueLabel: string;
    nullableLabel: string;
    autoIncrementLabel: string;
    autoIncrementHint: string;
  };
  keyDialog: {
    addTitle: string;
    editTitle: string;
    deleteTitle: string;
    /** ICU placeholder: {label} */
    deleteConfirmMessage: string;
    columnsLegend: string;
  };
  relationDialog: {
    deleteTitle: string;
    /** ICU placeholder: {label} */
    deleteConfirmMessage: string;
  };
  sidePanel: {
    schemaHeading: string;
    tablesLabel: string;
    createdLabel: string;
    tableHeading: string;
    deleteTableAriaLabel: string;
    columnsHeading: string;
    addColumn: string;
    /** ICU placeholder: {name} */
    editColumnAriaLabel: string;
    /** ICU placeholder: {name} */
    deleteColumnAriaLabel: string;
    keysHeading: string;
    addKey: string;
    /** ICU placeholder: {label} */
    editKeyAriaLabel: string;
    /** ICU placeholder: {label} */
    deleteKeyAriaLabel: string;
    relationsHeading: string;
    /** ICU placeholder: {label} */
    deleteRelationAriaLabel: string;
  };
  exportSql: {
    title: string;
    noPrimaryKeyHeading: string;
    generatedSqlAriaLabel: string;
    noTablesMessage: string;
    downloadSql: string;
    copyToClipboard: string;
    copied: string;
    close: string;
  };
  notificationBar: {
    dismissAriaLabel: string;
  };
  notifications: {
    couldNotSave: string;
    couldNotLoadSelected: string;
    /** ICU placeholder: {name} */
    couldNotLoadNamed: string;
  };
  tableNode: {
    /** ICU placeholder: {name} */
    ariaLabel: string;
    dropHint: string;
    sourceHandleTitle: string;
    targetHandleTitle: string;
  };
  notFound: {
    heading: string;
    body: string;
  };
  settings: {
    heading: string;
    backLinkLabel: string;
    foreignKeysCategoryHeading: string;
    namingPatternLegend: string;
    namingPatternTableColumnLabel: string;
    namingPatternTableColumnExample: string;
    namingPatternTableIdLabel: string;
    namingPatternTableIdExample: string;
  };
};

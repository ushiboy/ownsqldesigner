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
    dialectLabel: string;
  };
  tableDialog: {
    newTitle: string;
    deleteTitle: string;
    /** ICU placeholder: {name} */
    deleteConfirmMessage: string;
    deleteTitleMultiple: string;
    /** ICU placeholder: {count} */
    deleteConfirmMessageMultiple: string;
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
      CONFLICTING_PRIMARY_KEY: string;
      PART_OF_COMPOSITE_KEY: string;
      REFERENCED_BY_FOREIGN_KEY: string;
    };
    sizeLabel: string;
    sizeNotApplicableHint: string;
    sizeInvalidFormatHint: string;
    precisionLabel: string;
    precisionNotApplicableHint: string;
    precisionInvalidFormatHint: string;
    defaultValueLabel: string;
    defaultValueNotApplicableHint: string;
    defaultValueInvalidFormatHint: string;
    nullableLabel: string;
    autoIncrementLabel: string;
    /** ICU placeholder: {types} */
    autoIncrementHint: string;
  };
  keyDialog: {
    addTitle: string;
    editTitle: string;
    deleteTitle: string;
    /** ICU placeholder: {label} */
    deleteConfirmMessage: string;
    /** ICU placeholder: {label} */
    deleteConfirmMessageReferenced: string;
    columnsLegend: string;
    /** ICU placeholder: {column} */
    moveColumnUp: string;
    /** ICU placeholder: {column} */
    moveColumnDown: string;
    referencedKeyEditBlockedHint: string;
    duplicateIndexHint: string;
  };
  relationDialog: {
    deleteTitle: string;
    /** ICU placeholder: {label} */
    deleteConfirmMessage: string;
  };
  sidePanel: {
    schemaHeading: string;
    dialectLabel: string;
    tablesLabel: string;
    createdLabel: string;
    /** ICU placeholder: {count} */
    multipleTablesSelectedHeading: string;
    tableHeading: string;
    deleteTableAriaLabel: string;
    columnsHeading: string;
    addColumn: string;
    /** ICU placeholder: {name} */
    editColumnAriaLabel: string;
    /** ICU placeholder: {name} */
    deleteColumnAriaLabel: string;
    /** ICU placeholder: {name} */
    moveColumnUpAriaLabel: string;
    /** ICU placeholder: {name} */
    moveColumnDownAriaLabel: string;
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
    defaultColumnsCategoryHeading: string;
    defaultColumnsDialectLegend: string;
    defaultColumnsEmptyHint: string;
  };
};

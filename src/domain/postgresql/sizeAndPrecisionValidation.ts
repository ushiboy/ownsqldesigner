const POSITIVE_INT_PATTERN = /^[1-9]\d*$/;
const NUMERIC_SIZE_PATTERN = /^[1-9]\d*(,(0|[1-9]\d*))?$/;
const PRECISION_PATTERN = /^[0-6]$/;

/** Whether `value` is a valid `size` modifier for `type` under PostgreSQL (0039). */
export function isPostgresqlSizeValid(type: string, value: string): boolean {
  if (value === "") {
    return true;
  }
  if (type === "NUMERIC") {
    if (!NUMERIC_SIZE_PATTERN.test(value)) {
      return false;
    }
    const [precision, scale] = value.split(",").map(Number);
    return scale === undefined || scale <= precision;
  }
  if (type === "VARCHAR" || type === "CHAR") {
    return POSITIVE_INT_PATTERN.test(value);
  }
  return true;
}

/** Whether `value` is a valid `precision` modifier for `type` under PostgreSQL (0039). */
export function isPostgresqlPrecisionValid(type: string, value: string): boolean {
  if (value === "") {
    return true;
  }
  if (type === "TIME" || type === "TIMESTAMP") {
    return PRECISION_PATTERN.test(value);
  }
  return true;
}

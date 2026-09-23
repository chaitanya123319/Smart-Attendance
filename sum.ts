export function sum(...values: Array<number | string>) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export default sum;

if (require.main === module) {
  const result = sum(1, 2, 3, 4, 5);
  console.log(`Sum: ${result}`);
}

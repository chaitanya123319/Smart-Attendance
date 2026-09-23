function sum(...values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

module.exports = { sum };
module.exports.default = sum;

if (require.main === module) {
  const result = sum(1, 2, 3, 4, 5);
  console.log(`Sum: ${result}`);
}

/**
 * Generates a random auth code consisting of uppercase letters
 * @param {number} [len=5] The length of the auth code
 * @returns {string} An auth code
 * @example
 * generateAuthCode(5) // "FAEBC"
 */
export function generateAuthCode(len = 5) {
  let result = ""
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let counter = 0
  while (counter < len) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
    counter += 1
  }
  return result
}

import {EmailClient} from "./emailClient"

export const consoleLogEmail = (): EmailClient => {
  return {
    send: async (params) => {
      try {
        console.info(
          `
          ------------------------------
          Sending email to ${params.to}
          ${params.subject}
          ${params.html}
          ------------------------------

          `
        )
      } catch (error: any) {
        console.error(error)
        if (error.response) {
          console.error(error.response.body)
        }
      }
    },
  }
}

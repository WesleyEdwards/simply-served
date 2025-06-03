export type EmailClient = {
  send: (params: {
    to: string
    subject: string
    html: string
  }) => Promise<unknown>
}
import {Express} from "express"
import {generateSdk} from "./sdkGenerator"
import {MetaInfo} from "../meta"

export function addSdkRoute(app: Express) {
  app.get("/meta/sdk.ts", (req, res) => {
    const a = app as Express & {_meta?: MetaInfo[]}
    const sdk = generateSdk(a._meta || [])
    res.setHeader("Content-Type", "text/plain")
    res.send(sdk)
  })
}

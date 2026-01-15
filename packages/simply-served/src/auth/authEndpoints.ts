// import {buildRoute} from "endpoints"
// import {DbMethods, HasId} from "server"
// import {ServerContext} from "types"

// const authEndpoints = <SUBJECT extends HasId, C extends ServerContext>(params: {
//   subjectMethods: (db: C["db"]) => DbMethods<SUBJECT>
//   subjectId: (auth: C["auth"]) => string
// }) => ({
//   self: buildRoute<C>("get")
//     .path("/self")
//     .withAuth()
//     .build(async ({db}, res, auth) => {
//       const s = params.subjectMethods(db).findOneById(params.subjectId(auth))
//       return res.json(s)
//     }),
//     // TODO: Refresh token
// })

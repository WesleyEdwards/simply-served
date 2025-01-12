import {
  CallExpression,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SyntaxKind,
  Type
} from "ts-morph"

const generate = () => {
  const project = new Project({
    tsConfigFilePath: "../tsconfig.json"
  })

  const sourceFile = project.addSourceFileAtPath("./src/index.ts")

  sourceFile.getVariableDeclarations().forEach((variable) => {
    const createSimpleFun = variable.getLastChildByKind(
      SyntaxKind.CallExpression
    )

    const isSimpleServer = createSimpleFun
      ?.getText()
      .includes("createSimplyServer")
    if (!isSimpleServer) {
      return
    }

    // console.log(createSimpleFun?.getType().getText())

    const argsObject = createSimpleFun?.getArguments()?.at(0)
    if (!argsObject) {
      return
    }

    if (isObjectLiteralExpression(argsObject)) {
      const properties = argsObject.getProperties()

      properties.filter(isPropertyAssignment).forEach((property) => {
        if (property.getName() === "controllers") {
          getControllers(property)
        }
      })
    }
  })
}

const getControllers = (property: PropertyAssignment) => {
  // property.getName() === "controllers"
  const initializer = property.getInitializer()
  if (isObjectLiteralExpression(initializer)) {
    const props = initializer.getProperties()
    props.filter(isPropertyAssignment).forEach((p) => {
      console.log("controller", p.getName())
      const i = p.getInitializer()
      // collection db
      if (i instanceof CallExpression) {
        const type = i.getReturnType()
        const clean = cleanType(type)
        console.log(clean)
      }
    })
  }
}

const isPropertyAssignment = (p: any): p is PropertyAssignment => {
  return p instanceof PropertyAssignment
}

const isObjectLiteralExpression = (p: any): p is ObjectLiteralExpression => {
  return p instanceof ObjectLiteralExpression
}
const cleanType = (type: Type) =>
  type.getText().replace(/import\([^)]+\)\./g, "")

generate()

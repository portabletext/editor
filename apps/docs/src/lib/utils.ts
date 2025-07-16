import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Project, Node } from "ts-morph"
import path from "path"
import fs from "fs"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Reads a TypeScript file and extracts the value of an exported array variable.
 * Only works for arrays of literals (strings, numbers, booleans).
 * @param filePath Absolute or relative path to the TypeScript file
 * @param exportName Name of the exported variable to extract
 * @returns The array value, or null if not found or not an array of literals
 */
export async function getExportedArrayFromTsFile(filePath: string, exportName: string): Promise<unknown[] | null> {
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath)

  if (!fs.existsSync(absPath)) return null

  const project = new Project({
    tsConfigFilePath: undefined, // No need for a tsconfig
    skipAddingFilesFromTsConfig: true,
  })
  const sourceFile = project.addSourceFileAtPath(absPath)
  // Find any variable declaration, not just exported
  const varDecl = sourceFile.getVariableDeclarations().find(
    v => v.getName() === exportName
  )
  const allVars = sourceFile.getVariableDeclarations().map(v => v.getName())
  if (!varDecl) {
    return null
  }
  const initializer = varDecl.getInitializer()
  if (!initializer) {
    return null
  }

  // Handle 'as const' (TypeAssertion) case
  let arrayLiteral = initializer
  if (Node.isTypeAssertion(initializer) || Node.isAsExpression?.(initializer)) {
    arrayLiteral = initializer.getExpression()
  }

  if (!Node.isArrayLiteralExpression(arrayLiteral)) {
    return null
  }

  const arr = arrayLiteral.getElements().map(el => {
    if (Node.isStringLiteral(el)) return el.getLiteralText()
    if (Node.isNumericLiteral(el)) return Number(el.getText())
    if (el.getKindName() === "TrueKeyword") return true
    if (el.getKindName() === "FalseKeyword") return false
    // Add more literal types as needed
    return null
  })
  return arr
}


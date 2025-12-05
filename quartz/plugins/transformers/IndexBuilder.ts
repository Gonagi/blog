import fs from "fs"
import path from "path"
import { QuartzTransformerPlugin } from "../../cfg"
import { parseIndexFile } from "./IndexParser"

export const IndexBuilder: QuartzTransformerPlugin = () => {
  return {
    name: "IndexBuilder",
    htmlPlugins() {
      return []
    },
    async beforeBuild() {
      console.log("🔧 Building Index Structure...")

      const INDEX_PATHS = {
        LogLens: "content/Project/LogLens Index.md",
        EatDa: "content/Project/EatDa Index.md",
        Pposong: "content/Project/뽀송길 Index.md",
        CS: "content/CS/CS Index.md",
        Docker: "content/Docker/Docker Index.md",
        Java: "content/Java/Java Index.md",
      }

      const indexData: any = {}

      for (const key in INDEX_PATHS) {
        const filePath = INDEX_PATHS[key]
        if (fs.existsSync(filePath)) {
          indexData[key] = parseIndexFile(filePath)
        } else {
          console.warn(`⚠ Index file not found: ${filePath}`)
        }
      }

      const outDir = "quartz/generated"
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

      const outFile = path.join(outDir, "indexStructure.json")
      fs.writeFileSync(outFile, JSON.stringify(indexData, null, 2))

      console.log("✅ Index structure generated.")
    },
  }
}

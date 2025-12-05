import fs from "fs"
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

      // 🔥 JSON 파일 생성 대신 글로벌 변수에 저장
      ;(globalThis as any).__INDEX_DATA__ = indexData

      console.log("✅ Index structure stored in globalThis.__INDEX_DATA__")
    },
  }
}

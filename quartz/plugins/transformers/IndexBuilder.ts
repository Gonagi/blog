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
        LogLens: "content/Project/LogLens/LogLens Index.md",
        EatDa: "content/Project/EatDa/EatDa Index.md",
        Pposong: "content/Project/뽀송길/뽀송길 Index.md",
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

      // 🔥 글로벌 변수와 JSON 파일 모두에 저장
      ;(globalThis as any).__INDEX_DATA__ = indexData

      // static 폴더에 JSON 파일 생성
      const outputDir = path.join(process.cwd(), "public")
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      const outputPath = path.join(outputDir, "index-data.json")
      fs.writeFileSync(outputPath, JSON.stringify(indexData, null, 2))

      console.log("✅ Index structure saved:", outputPath)
    },
  }
}

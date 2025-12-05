import { FilePath, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../../cfg"
import fs from "fs"

export interface IndexTree {
  [section: string]: {
    text: string
    link: string
  }[]
}

function parseIndexFile(filePath: string): IndexTree {
  const content = fs.readFileSync(filePath, "utf8")
  const lines = content.split("\n")

  const tree: IndexTree = {}
  let currentSection = ""

  for (const line of lines) {
    // ## 섹션 찾기
    const sectionMatch = line.match(/^###?\s+(.*)/)
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim()
      tree[currentSection] = []
      continue
    }

    // [[링크|표시명]] 찾기
    const linkMatch = line.match(/\[\[(.*?)\|(.*?)\]\]/)
    if (linkMatch && currentSection) {
      const link = linkMatch[1]
      const text = linkMatch[2]
      tree[currentSection].push({
        text,
        link: "/" + link.replace(/ /g, "_"),
      })
    }
  }

  return tree
}

export const IndexDataEmitter: QuartzEmitterPlugin = () => {
  return {
    name: "IndexDataEmitter",
    async emit(ctx, _content, _resources): Promise<FilePath[]> {
      console.log("🔧 Building Index Structure...")

      const INDEX_PATHS: Record<string, string> = {
        LogLens: "content/Project/LogLens/LogLens Index.md",
        EatDa: "content/Project/EatDa/EatDa Index.md",
        Pposong: "content/Project/뽀송길/뽀송길 Index.md",
        CS: "content/CS/CS Index.md",
        Docker: "content/Docker/Docker Index.md",
        Java: "content/Java/Java Index.md",
      }

      const indexData: Record<string, IndexTree> = {}

      for (const key in INDEX_PATHS) {
        const filePath = INDEX_PATHS[key]
        if (fs.existsSync(filePath)) {
          indexData[key] = parseIndexFile(filePath)
          console.log(`✅ Parsed: ${filePath}`)
        } else {
          console.warn(`⚠ Index file not found: ${filePath}`)
        }
      }

      // JSON 파일 생성
      const outputPath = joinSegments(ctx.argv.output, "index-data.json") as FilePath
      await fs.promises.writeFile(outputPath, JSON.stringify(indexData, null, 2))

      console.log(`✅ Index data saved to: ${outputPath}`)

      return [outputPath]
    },
  }
}

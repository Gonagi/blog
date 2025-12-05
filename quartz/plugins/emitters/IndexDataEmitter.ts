import { FullSlug, joinSegments, simplifySlug, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../../cfg"
import { write } from "./helpers"
import fs from "fs"

export interface IndexTree {
  [section: string]: {
    text: string
    link: string
  }[]
}

function parseIndexFile(
  filePath: string,
  titleToSlugMap: Map<string, string>,
): IndexTree {
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

    // [[링크|표시명]] 또는 [표시명](URL) 찾기
    const wikiLinkMatch = line.match(/\[\[(.*?)(?:\|(.*?))?\]\]/)
    const markdownLinkMatch = line.match(/\[(.*?)\]\((.*?)\)/)

    if (wikiLinkMatch && currentSection) {
      const link = wikiLinkMatch[1].trim()
      const text = wikiLinkMatch[2]?.trim() || link

      // 외부 링크는 그대로 사용
      if (link.startsWith("http://") || link.startsWith("https://")) {
        tree[currentSection].push({ text, link })
        continue
      }

      // titleToSlugMap에서 실제 slug 찾기
      const slug = titleToSlugMap.get(link)
      if (slug) {
        tree[currentSection].push({ text, link: "/" + slug })
      } else {
        console.warn(`⚠ Could not find slug for: ${link}`)
      }
    } else if (markdownLinkMatch && currentSection) {
      // 일반 마크다운 링크 (외부 링크)
      const text = markdownLinkMatch[1]
      const link = markdownLinkMatch[2]
      tree[currentSection].push({ text, link })
    }
  }

  return tree
}

export const IndexDataEmitter: QuartzEmitterPlugin = () => {
  return {
    name: "IndexDataEmitter",
    async *emit(ctx, content, _resources) {
      console.log("🔧 Building Index Structure...")

      // 파일명 → slug 매핑 생성
      const titleToSlugMap = new Map<string, string>()
      for (const [_tree, file] of content) {
        const title = file.data.frontmatter?.title
        const slug = simplifySlug(file.data.slug!)

        if (title) {
          titleToSlugMap.set(title, slug)
        }

        // 파일명도 매핑 (확장자 제외)
        const fileName = file.data.relativePath?.split("/").pop()?.replace(/\.md$/, "")
        if (fileName) {
          titleToSlugMap.set(fileName, slug)
        }
      }

      console.log(`📝 Created title-to-slug mapping with ${titleToSlugMap.size} entries`)

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
          indexData[key] = parseIndexFile(filePath, titleToSlugMap)
          console.log(`✅ Parsed: ${filePath}`)
        } else {
          console.warn(`⚠ Index file not found: ${filePath}`)
        }
      }

      // globalThis에 저장 (컴포넌트에서 접근 가능)
      ;(globalThis as any).__INDEX_DATA__ = indexData

      console.log(`✅ Index data stored in globalThis`)
    },
    externalResources() {
      // 빌드 타임 데이터를 클라이언트에 주입
      const indexData = (globalThis as any).__INDEX_DATA__ ?? {}
      return {
        js: [
          {
            loadTime: "beforeDOMReady",
            contentType: "inline",
            script: `window.__INDEX_DATA__ = ${JSON.stringify(indexData)};`,
          },
        ],
      }
    },
  }
}

import fs from "fs"
import path from "path"

export interface IndexTree {
  [section: string]: {
    text: string
    link: string
  }[]
}

export function parseIndexFile(filePath: string): IndexTree {
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
    const linkMatch = line.match(/\[\[(.*?)\|(.*?)]]/)
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

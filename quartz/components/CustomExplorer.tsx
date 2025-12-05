import { QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { useEffect, useState } from "preact/hooks"

function Section({ title, items }: { title: string; items: any[] }) {
  return (
    <details>
      <summary>{title}</summary>
      <ul>
        {items.map((it) => (
          <li>
            <a href={it.link}>{it.text}</a>
          </li>
        ))}
      </ul>
    </details>
  )
}

function IndexGroup({ name, data }: { name: string; data: any }) {
  if (!data) return null

  return (
    <details>
      <summary>{name}</summary>
      <div>
        {Object.keys(data).map((section) => (
          <Section title={section} items={data[section]} />
        ))}
      </div>
    </details>
  )
}

export default (() => {
  return function CustomExplorer(_: QuartzComponentProps) {
    const [indexData, setIndexData] = useState<any>({})

    useEffect(() => {
      // 먼저 globalThis 확인 (빌드 타임에 주입된 경우)
      const globalData = (globalThis as any).__INDEX_DATA__
      if (globalData && Object.keys(globalData).length > 0) {
        setIndexData(globalData)
        return
      }

      // 없으면 JSON 파일 로드
      fetch("/index-data.json")
        .then((res) => res.json())
        .then((data) => setIndexData(data))
        .catch((err) => console.error("Failed to load index data:", err))
    }, [])

    return (
      <div class="custom-explorer">
        <IndexGroup name="LogLens" data={indexData["LogLens"]} />
        <IndexGroup name="EatDa" data={indexData["EatDa"]} />
        <IndexGroup name="뽀송길" data={indexData["Pposong"]} />
        <IndexGroup name="CS" data={indexData["CS"]} />
        <IndexGroup name="Docker" data={indexData["Docker"]} />
        <IndexGroup name="Java" data={indexData["Java"]} />

        <hr />
        <slot id="explorer" />
      </div>
    )
  }
}) satisfies QuartzComponentConstructor

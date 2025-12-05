import { QuartzComponentConstructor, QuartzComponentProps } from "../types"

function Section({ title, items }: { title: string; items: any[] }) {
  if (!items || items.length === 0) return null

  return (
    <details>
      <summary>{title}</summary>
      <ul>
        {items.map((it, idx) => (
          <li key={idx}>
            <a href={it.link}>{it.text}</a>
          </li>
        ))}
      </ul>
    </details>
  )
}

function IndexGroup({ name, data }: { name: string; data: any }) {
  if (!data || Object.keys(data).length === 0) return null

  return (
    <details>
      <summary>{name}</summary>
      <div>
        {Object.keys(data).map((section, idx) => (
          <Section key={idx} title={section} items={data[section]} />
        ))}
      </div>
    </details>
  )
}

export default (() => {
  return function CustomExplorer(_: QuartzComponentProps) {
    // 빌드 타임에 globalThis에서 데이터 가져오기
    const indexData = (globalThis as any).__INDEX_DATA__ ?? {}

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

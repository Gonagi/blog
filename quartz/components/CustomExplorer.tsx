import { QuartzComponentConstructor, QuartzComponentProps } from "../types"

declare const __INDEX_DATA__: any

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

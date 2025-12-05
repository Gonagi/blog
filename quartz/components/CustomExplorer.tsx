import { QuartzComponentConstructor, QuartzComponentProps } from "../types"
import indexData from "../generated/indexStructure.js"

function Section({ title, items }: { title: string; items: any[] }) {
  return (
    <details>
      <summary>{title}</summary>
      <ul>
        {items.map((it) => (
          <li><a href={it.link}>{it.text}</a></li>
        ))}
      </ul>
    </details>
  )
}

function IndexGroup({ name, data }: { name: string; data: any }) {
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
    return (
      <div class="custom-explorer">
        <IndexGroup name="LogLens" data={indexData["LogLens"]} />
        <IndexGroup name="EatDa" data={indexData["EatDa"]} />
        <IndexGroup name="뽀송길" data={indexData["Pposong"]} />
        <IndexGroup name="CS" data={indexData["CS"]} />
        <IndexGroup name="Docker" data={indexData["Docker"]} />
        <IndexGroup name="Java" data={indexData["Java"]} />

        {/* 기존 Explorer도 유지 */}
        <hr />
        <slot id="explorer" />
      </div>
    )
  }
}) satisfies QuartzComponentConstructor

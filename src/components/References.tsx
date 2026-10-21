/**
 * 论文式引用: 正文里放上标编号 [1], 页末列出出处。
 *
 * 现在只有编号和"这条该填哪篇"的说明, 条目先留空 —— 等文献确定后再填。
 * 每个页面**各自编号**, 从 [1] 开始, 和论文章节的惯例一致。
 *
 * 用法:
 *   <Cite n={2} />                     -> 上标 [2]
 *   <References refs={refs} />          -> 页末的出处列表
 *
 * 加一条时只需要在页面的 refs 数组里补一项, 说明写清楚"支撑的是哪个数/哪句话",
 * 这样填文献的人一眼就知道该放哪篇。
 */

export interface Ref {
  /** 本页内的编号, 从 1 开始 */
  n: number
  /** 这条出处支撑的是什么 —— 填文献的人看这一行就知道该放哪篇 */
  what: string
  /** 文献条目 (作者, 年份, 期刊, 编号)。留空表示待补。 */
  entry?: string
}

export function Cite({ n }: { n: number }) {
  return (
    <sup className="cite" aria-label={`reference ${n}`}>
      [{n}]
    </sup>
  )
}

export function References({ refs, title = 'References' }: { refs: Ref[]; title?: string }) {
  return (
    <section className="section section--refs">
      <h2 className="section-title section-title--refs">{title}</h2>
      <ol className="refs">
        {refs.map((r) => (
          <li key={r.n} className="refs__item" id={`ref-${r.n}`}>
            <span className="refs__n">[{r.n}]</span>
            <span className="refs__body">
              {r.entry ? (
                <span className="refs__entry">{r.entry}</span>
              ) : (
                <span className="refs__todo">entry to be added</span>
              )}
              <span className="refs__what">{r.what}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

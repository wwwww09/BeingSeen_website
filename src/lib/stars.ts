/**
 * 留言板星图的星星数量。
 *
 * 为什么单独放一个模块
 * ----------------------------------------------------------------------------
 * 这个数字原来在 Guestbook.tsx 和 StoryStarfield.tsx 里各写了一遍。两处必须
 * 永远一致 —— 星图按它画星星, 分配逻辑按它校验 star_index —— 一旦有人只改了
 * 其中一处, 就会出现"点得中的星星其实不在可分配范围内"这类错位。
 *
 * 也不能放在 StoryStarfield 里让 Guestbook 去 import: 星图是动态加载的
 * (clientOnly + ssr:false), 反向引用会把整个 three.js 拖进首屏包。
 * 所以放在这个两边都能安全引用的中立模块里。
 */
export const STAR_COUNT = 320

/**
 * 一次读取多少条故事。
 *
 * 取 STAR_COUNT 而不是随手写一个 200: 星星只有 STAR_COUNT 颗, 一颗星一个故事,
 * 所以"最近 STAR_COUNT 条"正好是星图能表达的全部内容。
 * 之前写 200 的时候, 故事数超过 200 之后旧故事既不进列表、也不点亮星星,
 * 而页面却写着"N of 320 stars", 两边对不上。
 *
 * 超过 STAR_COUNT 条之后, 更早的故事不再显示 —— 因为已经没有空星可以点了。
 */
export const STORY_FETCH_LIMIT = STAR_COUNT

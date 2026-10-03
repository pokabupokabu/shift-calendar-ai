/**
 * ルーティング（主にrouter.replace）の実行を1マクロタスク分遅延させる。
 *
 * react-domとexpo-routerのWeb上での相互作用を回避するためのワークアラウンド:
 * Zustand由来のstate更新と、expo-router自身のアンマウントコミットが同一tick内で
 * 競合すると、react-domが「Failed to execute 'removeChild' on 'Node': The node
 * to be removed is not a child of this node.」を投げることがある。
 * setTimeout(fn, 0)で1tick遅らせることで、state更新側のコミットを先に完了させてから
 * router側のアンマウントコミットを走らせる。
 */
export function deferNavigation(fn: () => void): void {
  setTimeout(fn, 0);
}

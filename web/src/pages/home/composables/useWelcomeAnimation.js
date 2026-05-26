import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 分步触发的欢迎页进入动画。
 * step 取值:0=隐藏,1=容器淡入,2=Logo,3=标题,4=副标题,5=提示
 */
export function useWelcomeAnimation() {
  const step = ref(0)
  const timers = []

  onMounted(() => {
    const delays = [60, 240, 420, 700, 1000]
    delays.forEach((delay, index) => {
      timers.push(setTimeout(() => (step.value = index + 1), delay))
    })
  })

  onBeforeUnmount(() => {
    timers.forEach((id) => clearTimeout(id))
  })

  return { step }
}

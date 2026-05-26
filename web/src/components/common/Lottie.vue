<script setup>
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue'
import lottie from 'lottie-web'

const props = defineProps({
  params: {
    type: Object,
    required: true
  },
  width: {
    type: [String, Number],
    default: '100%'
  },
  height: {
    type: [String, Number],
    default: '100%'
  }
})

const emit = defineEmits(['ready'])

const container = ref(null)
const instance = shallowRef(null)

const toSize = (v) => (typeof v === 'number' ? `${v}px` : v)

const destroy = () => {
  if (instance.value) {
    instance.value.destroy()
    instance.value = null
  }
}

const load = () => {
  destroy()
  if (!container.value) return
  instance.value = lottie.loadAnimation({
    container: container.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    ...props.params
  })
  emit('ready', instance.value)
}

onMounted(load)
onBeforeUnmount(destroy)

watch(() => props.params, load, { deep: false })
</script>

<template>
  <div
    ref="container"
    class="lottie-host"
    :style="{ width: toSize(width), height: toSize(height) }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.lottie-host {
  display: block;
}
.lottie-host :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

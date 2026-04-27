<template>
  <component :is="customComponent" v-if="customComponent" v-bind="customProps" />
  <PrinceCard v-else :title="`Delete ${displayTitle}`">
    <div v-if="store.loading">Loading…</div>
    <div v-else-if="store.error && !item" class="vue-resource prince-error">
      Failed to load {{ displayTitle }}
    </div>
    <template v-else>
      <p class="vue-resource delete-message">
        You are deleting <strong>{{ displayTitle }}</strong
        >. Are you sure you want to continue?
      </p>
      <div v-if="store.error" class="vue-resource prince-error">
        Failed to delete {{ displayTitle }}
      </div>
    </template>
    <template #footer>
      <PrinceButton type="Cancel" @click="cancel" />
      <PrinceButton type="Delete" @click="confirm">Delete {{ displayTitle }}</PrinceButton>
    </template>
  </PrinceCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResourceDeletePageProps } from '../page-props'
import { createResourceController } from '../resource-controller'
import PrinceButton from '../ui/PrinceButton.vue'
import PrinceCard from '../ui/PrinceCard.vue'

const route = useRoute()
const router = useRouter()
const store = createResourceController(route.meta.spec!).store()

const id = route.params.id as string
const segment = computed(() => route.meta.spec?.route.split('/').pop())

const item = ref<Record<string, unknown> | null>(null)

const itemTitle = computed(() => {
  const titleFn = route.meta.spec?.title
  return titleFn && item.value ? titleFn(item.value) : undefined
})

const displayTitle = computed(() => itemTitle.value ?? id)

onMounted(async () => {
  const result = await store.get(id)
  if (result) item.value = result.data as Record<string, unknown>
})

function cancel() {
  router.push({ name: `${segment.value}-detail`, params: { id } })
}

async function confirm() {
  await store.remove(id)
  if (!store.error) router.push({ name: `${segment.value}-list` })
}

const customComponent = computed(() => route.meta.spec?.components?.delete)

const customProps = computed<ResourceDeletePageProps>(() => ({
  item: item.value,
  resource: route.meta.spec?.name,
  loading: store.loading,
  error: store.error,
  itemTitle: itemTitle.value,
  cancel,
  confirm,
}))
</script>

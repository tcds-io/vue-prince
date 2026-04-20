<template>
  <PrinceCard title="Not Found">
    <p class="vue-resource permission-denied-message">
      The page you are looking for does not exist or you don't have permission to access it.
    </p>
    <template #footer>
      <PrinceButton type="Back" @click="back">Go back</PrinceButton>
    </template>
  </PrinceCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import PrinceCard from '../ui/PrinceCard.vue'
import PrinceButton from '../ui/PrinceButton.vue'

const router = useRouter()

function back() {
  router.back()
}
</script>

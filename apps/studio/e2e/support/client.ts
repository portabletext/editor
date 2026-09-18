import {createClient} from '@sanity/client'

export function createLabClient() {
  return createClient({
    projectId: 'e2sapjbh',
    dataset: 'scratch',
    apiVersion: '2026-01-01',
    token: process.env.SANITY_PTE_LAB_TOKEN,
    useCdn: false,
  })
}

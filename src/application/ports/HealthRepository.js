/** Port: persists the user state (only what the crew changed; the seed is read-only). */
export class HealthRepository {
  /** @returns {import('zod').infer<typeof import('../../domain/schemas/userState.js').UserStateSchema> | null} */
  load() {
    throw new Error('HealthRepository.load must be implemented');
  }
  save() {
    throw new Error('HealthRepository.save must be implemented');
  }
  clear() {
    throw new Error('HealthRepository.clear must be implemented');
  }
}

import { describe, it, expect, vi } from 'vitest'
import { fetchWithRetry } from '../../datasets/fetchWithRetry'

function okResponse(status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve({}) }
}

describe('fetchWithRetry', () => {
  it('returns the response on the first try when ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(200))
    const result = await fetchWithRetry('/x', { fetchImpl, backoffMs: 0 })
    expect(result.attemptsUsed).toBe(1)
    expect(result.response.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries on 503 and succeeds on the second try', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(okResponse(503))
      .mockResolvedValueOnce(okResponse(200))
    const result = await fetchWithRetry('/x', { fetchImpl, attempts: 2, backoffMs: 0 })
    expect(result.attemptsUsed).toBe(2)
    expect(result.response.status).toBe(200)
  })

  it('does not retry on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(404))
    await expect(
      fetchWithRetry('/x', { fetchImpl, attempts: 3, backoffMs: 0 }),
    ).rejects.toThrow('HTTP 404')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries on a fetch network exception then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(okResponse(200))
    const result = await fetchWithRetry('/x', { fetchImpl, attempts: 2, backoffMs: 0 })
    expect(result.attemptsUsed).toBe(2)
  })

  it('throws after all attempts are exhausted on 5xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(503))
    await expect(
      fetchWithRetry('/x', { fetchImpl, attempts: 2, backoffMs: 0 }),
    ).rejects.toThrow('HTTP 503')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws after all attempts are exhausted on network errors', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(
      fetchWithRetry('/x', { fetchImpl, attempts: 3, backoffMs: 0 }),
    ).rejects.toThrow('fetch failed')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})

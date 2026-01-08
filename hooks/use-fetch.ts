'use client'
import { useState } from "react"
import { toast } from "sonner"

// T represents the data type, Args represents the function arguments
const useFetch = <T, Args extends any[]>(
  callback: (...args: Args) => Promise<T>
) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fn = async (...args: Args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await callback(...args)
      setData(res)
      return res // Return data for immediate use if needed
    } catch (err: any) {
      const errorObject = err instanceof Error ? err : new Error(err?.message || "An error occurred")
      setError(errorObject)
      toast.error("Error")
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, fn, setData }
}

export default useFetch;
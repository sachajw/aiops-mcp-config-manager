export const isDev = (): boolean => {
  return process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
}

export const isProduction = (): boolean => {
  return !isDev()
}

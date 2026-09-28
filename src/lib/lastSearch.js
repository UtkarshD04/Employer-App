// The profile page scores a candidate against whatever was last searched, and its Previous / Next
// steps through the last ranked results — kept in memory for the session (the website uses
// sessionStorage for the same purpose).
import { makeCriteria } from './talent/criteria'

let criteria = makeCriteria()
let results = []

export const saveLastCriteria = (c) => {
  criteria = c
}
export const loadLastCriteria = () => makeCriteria(criteria)
export const saveLastResults = (ids) => {
  results = ids
}
export const loadLastResults = () => results

export type CVContact = {
  email: string
  phone: string
  address: string
  linkedin?: string
  website?: string
}

export type CVSubProject = {
  id: string
  clientOrProject: string
  role?: string
  period?: string
  highlights?: string[]
  technicalTools?: string
  trackingTools?: string
  developmentProcess?: string
}

export type CVExperience = {
  id: string
  period: string
  role: string
  company: string
  highlights: string[]
  subProjects?: CVSubProject[]
  projectDetails?: string[]
  technicalTools?: string
  trackingTools?: string
  developmentProcess?: string
}

export type CVEducation = {
  id: string
  period: string
  degree: string
  school: string
}

export type CVSkills = {
  primary: string[]
  secondary: string[]
}

export type CVData = {
  fullName: string
  jobTitle: string
  contact: CVContact
  objective: string
  experiences: CVExperience[]
  educations: CVEducation[]
  skills: CVSkills
  certifications: string[]
}

export type CVRecord = {
  id: string
  title: string
  data: CVData
  created_at?: string
  updated_at?: string
}

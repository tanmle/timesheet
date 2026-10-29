'use client'

import React from 'react'
import styles from './page.module.css'
import { CVData, CVExperience, CVEducation } from './types'

interface CVEditorProps {
  cvTitle: string
  setCvTitle: (val: string) => void
  data: CVData
  onChange: (newData: CVData) => void
}

export default function CVEditor({
  cvTitle,
  setCvTitle,
  data,
  onChange,
}: CVEditorProps) {
  // Field updates
  const updateContact = (field: keyof CVData['contact'], value: string) => {
    onChange({
      ...data,
      contact: {
        ...data.contact,
        [field]: value,
      },
    })
  }

  // Experience handlers
  const addExperience = () => {
    const newExp: CVExperience = {
      id: 'exp-' + Date.now(),
      period: 'Year - Present',
      role: 'Job Title',
      company: 'Company Name',
      highlights: ['Key responsibility or achievement'],
    }
    onChange({
      ...data,
      experiences: [newExp, ...data.experiences],
    })
  }

  const updateExperience = (id: string, updates: Partial<CVExperience>) => {
    onChange({
      ...data,
      experiences: data.experiences.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    })
  }

  const deleteExperience = (id: string) => {
    onChange({
      ...data,
      experiences: data.experiences.filter((exp) => exp.id !== id),
    })
  }

  const moveExperience = (index: number, direction: 'up' | 'down') => {
    const newArr = [...data.experiences]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newArr.length) return
    const temp = newArr[index]
    newArr[index] = newArr[targetIndex]
    newArr[targetIndex] = temp
    onChange({ ...data, experiences: newArr })
  }

  // Education handlers
  const addEducation = () => {
    const newEdu: CVEducation = {
      id: 'edu-' + Date.now(),
      period: '2020 - 2024',
      degree: 'Bachelor of Science',
      school: 'University Name',
    }
    onChange({
      ...data,
      educations: [...data.educations, newEdu],
    })
  }

  const updateEducation = (id: string, updates: Partial<CVEducation>) => {
    onChange({
      ...data,
      educations: data.educations.map((edu) =>
        edu.id === id ? { ...edu, ...updates } : edu
      ),
    })
  }

  const deleteEducation = (id: string) => {
    onChange({
      ...data,
      educations: data.educations.filter((edu) => edu.id !== id),
    })
  }

  return (
    <div className={styles.editorWrap}>
      {/* Document Settings */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Document Info</h2>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>CV Name (For your management)</label>
          <input
            type="text"
            className={styles.formInput}
            value={cvTitle}
            onChange={(e) => setCvTitle(e.target.value)}
            placeholder="e.g. Tan Le - Senior QA (Template)"
          />
        </div>
      </div>

      {/* 1. Personal & Contact Info */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Personal &amp; Contact Info</h2>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Full Name</label>
            <input
              type="text"
              className={styles.formInput}
              value={data.fullName}
              onChange={(e) => onChange({ ...data, fullName: e.target.value })}
              placeholder="e.g. Tan Le"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Professional Title</label>
            <input
              type="text"
              className={styles.formInput}
              value={data.jobTitle}
              onChange={(e) => onChange({ ...data, jobTitle: e.target.value })}
              placeholder="e.g. Delivery Manager/Automation Lead/Senior QA"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input
              type="email"
              className={styles.formInput}
              value={data.contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="e.g. mtan9x@gmail.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Phone Number</label>
            <input
              type="text"
              className={styles.formInput}
              value={data.contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              placeholder="e.g. 0385970622"
            />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Address / Location</label>
            <input
              type="text"
              className={styles.formInput}
              value={data.contact.address}
              onChange={(e) => updateContact('address', e.target.value)}
              placeholder="e.g. Da Nang, Vietnam"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>LinkedIn (Optional)</label>
            <input
              type="text"
              className={styles.formInput}
              value={data.contact.linkedin || ''}
              onChange={(e) => updateContact('linkedin', e.target.value)}
              placeholder="e.g. linkedin.com/in/username"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Website / GitHub (Optional)</label>
            <input
              type="text"
              className={styles.formInput}
              value={data.contact.website || ''}
              onChange={(e) => updateContact('website', e.target.value)}
              placeholder="e.g. github.com/username"
            />
          </div>
        </div>
      </div>

      {/* 2. Objective / Summary */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Objective / Summary</h2>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Career Statement &amp; Background</label>
          <textarea
            className={styles.formTextarea}
            rows={6}
            value={data.objective}
            onChange={(e) => onChange({ ...data, objective: e.target.value })}
            placeholder="Introduce your years of experience, core domains, mindset, and strengths..."
          />
          <span className={styles.fieldHint}>
            Paragraphs are preserved and aligned in the template.
          </span>
        </div>
      </div>

      {/* 3. Work Experience */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Work Experience ({data.experiences.length})
          </h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={addExperience}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            + Add Experience
          </button>
        </div>

        {data.experiences.map((exp, index) => (
          <div key={exp.id} className={styles.itemCard}>
            <div className={styles.itemCardHeader}>
              <span className={styles.itemCardTitle}>
                #{index + 1}: {exp.role || 'Role'} @ {exp.company || 'Company'}
              </span>
              <div className={styles.itemCardActions}>
                <button
                  type="button"
                  title="Move Up"
                  className={styles.btnIconSmall}
                  disabled={index === 0}
                  onClick={() => moveExperience(index, 'up')}
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Move Down"
                  className={styles.btnIconSmall}
                  disabled={index === data.experiences.length - 1}
                  onClick={() => moveExperience(index, 'down')}
                >
                  ↓
                </button>
                <button
                  type="button"
                  title="Delete Item"
                  className={`${styles.btnIconSmall} ${styles.btnDanger}`}
                  onClick={() => deleteExperience(exp.id)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date Period</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={exp.period}
                  onChange={(e) => updateExperience(exp.id, { period: e.target.value })}
                  placeholder="e.g. Aug 2024 - Present"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Role / Job Title</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={exp.role}
                  onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                  placeholder="e.g. SDIT"
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>Company Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                  placeholder="e.g. Talent Edge"
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>
                  Responsibilities &amp; Achievements (1 bullet point per line)
                </label>
                <textarea
                  className={styles.formTextarea}
                  rows={4}
                  value={exp.highlights.join('\n')}
                  onChange={(e) =>
                    updateExperience(exp.id, {
                      highlights: e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="• Developed test automation framework...&#10;• Implemented CI/CD pipelines..."
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>
                  Project Details (Optional, 1 bullet point per line)
                </label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={(exp.projectDetails || []).join('\n')}
                  onChange={(e) =>
                    updateExperience(exp.id, {
                      projectDetails: e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="• Implement automated test scripts for both UI and API..."
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>Technical Environment (Optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={exp.technicalTools || ''}
                    onChange={(e) => updateExperience(exp.id, { technicalTools: e.target.value })}
                    placeholder="Technical tools : VisualCode, Gitlab, Jenkins, Cypress..."
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={exp.trackingTools || ''}
                    onChange={(e) => updateExperience(exp.id, { trackingTools: e.target.value })}
                    placeholder="Test case/Issue tracking tool : Jira, ADO..."
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={exp.developmentProcess || ''}
                    onChange={(e) => updateExperience(exp.id, { developmentProcess: e.target.value })}
                    placeholder="Development process : Scrum, Kanban..."
                  />
                </div>
              </div>

              {/* Sub-projects / Client Accounts (e.g. LogiGear) */}
              {exp.subProjects && exp.subProjects.length > 0 && (
                <div className={styles.formGroupFull} style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className={styles.formLabel} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      Sub-Projects / Client Accounts ({exp.subProjects.length})
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {exp.subProjects.map((sp, spIdx) => (
                      <div
                        key={sp.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--on-surface)' }}>
                            #{spIdx + 1}: {sp.clientOrProject} {sp.role ? `(${sp.role})` : ''}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>{sp.period}</span>
                        </div>

                        <div className={styles.formGrid}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Client / Project Name</label>
                            <input
                              type="text"
                              className={styles.formInput}
                              value={sp.clientOrProject}
                              onChange={(e) => {
                                const newSub = exp.subProjects!.map((s) =>
                                  s.id === sp.id ? { ...s, clientOrProject: e.target.value } : s
                                )
                                updateExperience(exp.id, { subProjects: newSub })
                              }}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Role in Project</label>
                            <input
                              type="text"
                              className={styles.formInput}
                              value={sp.role || ''}
                              onChange={(e) => {
                                const newSub = exp.subProjects!.map((s) =>
                                  s.id === sp.id ? { ...s, role: e.target.value } : s
                                )
                                updateExperience(exp.id, { subProjects: newSub })
                              }}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Period</label>
                            <input
                              type="text"
                              className={styles.formInput}
                              value={sp.period || ''}
                              onChange={(e) => {
                                const newSub = exp.subProjects!.map((s) =>
                                  s.id === sp.id ? { ...s, period: e.target.value } : s
                                )
                                updateExperience(exp.id, { subProjects: newSub })
                              }}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Technical Tools</label>
                            <input
                              type="text"
                              className={styles.formInput}
                              value={sp.technicalTools || ''}
                              onChange={(e) => {
                                const newSub = exp.subProjects!.map((s) =>
                                  s.id === sp.id ? { ...s, technicalTools: e.target.value } : s
                                )
                                updateExperience(exp.id, { subProjects: newSub })
                              }}
                            />
                          </div>
                          <div className={styles.formGroupFull}>
                            <label className={styles.formLabel}>Highlights (1 per line)</label>
                            <textarea
                              className={styles.formTextarea}
                              rows={2}
                              value={(sp.highlights || []).join('\n')}
                              onChange={(e) => {
                                const newSub = exp.subProjects!.map((s) =>
                                  s.id === sp.id
                                    ? {
                                        ...s,
                                        highlights: e.target.value
                                          .split('\n')
                                          .map((l) => l.trim())
                                          .filter(Boolean),
                                      }
                                    : s
                                )
                                updateExperience(exp.id, { subProjects: newSub })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Education */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Education ({data.educations.length})
          </h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={addEducation}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            + Add Education
          </button>
        </div>

        {data.educations.map((edu, index) => (
          <div key={edu.id} className={styles.itemCard}>
            <div className={styles.itemCardHeader}>
              <span className={styles.itemCardTitle}>
                #{index + 1}: {edu.degree || 'Degree'}
              </span>
              <button
                type="button"
                className={`${styles.btnIconSmall} ${styles.btnDanger}`}
                onClick={() => deleteEducation(edu.id)}
              >
                ✕
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date Period</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={edu.period}
                  onChange={(e) => updateEducation(edu.id, { period: e.target.value })}
                  placeholder="e.g. Jan 2012 - Dec 2014"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Degree / Major</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={edu.degree}
                  onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                  placeholder="e.g. Bachelor of Science in Computer Science"
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>School / University</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={edu.school}
                  onChange={(e) => updateEducation(edu.id, { school: e.target.value })}
                  placeholder="e.g. Duy Tan University"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Achievements / Skills */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Achievements &amp; Skills</h2>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Primary Skills (1 bullet point per line)
          </label>
          <textarea
            className={styles.formTextarea}
            rows={7}
            value={data.skills.primary.join('\n')}
            onChange={(e) =>
              onChange({
                ...data,
                skills: {
                  ...data.skills,
                  primary: e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                },
              })
            }
            placeholder="OS: Windows, Mac OSX, and Linux.&#10;Programming languages: C#, Python, Java...&#10;Automation testing: Selenium, Cypress, Playwright..."
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Secondary Skills (1 bullet point per line)
          </label>
          <textarea
            className={styles.formTextarea}
            rows={5}
            value={data.skills.secondary.join('\n')}
            onChange={(e) =>
              onChange({
                ...data,
                skills: {
                  ...data.skills,
                  secondary: e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                },
              })
            }
            placeholder="Process and guideline creation&#10;Technical leadership&#10;Strong communication..."
          />
        </div>
      </div>

      {/* 6. Certifications & Courses */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Certifications &amp; Courses</h2>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Certificates (1 item per line)
          </label>
          <textarea
            className={styles.formTextarea}
            rows={5}
            value={data.certifications.join('\n')}
            onChange={(e) =>
              onChange({
                ...data,
                certifications: e.target.value
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Automation Anywhere Certified Advanced RPA Professional.&#10;Certified SAFe 5 Practitioner..."
          />
        </div>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import styles from './CVPreview.module.css'
import { CVData } from './types'

interface CVPreviewProps {
  data: CVData
}

export default function CVPreview({ data }: CVPreviewProps) {
  const {
    fullName,
    jobTitle,
    contact,
    objective,
    experiences = [],
    educations = [],
    skills = { primary: [], secondary: [] },
    certifications = [],
  } = data

  return (
    <div className={styles.previewContainer}>
      <article className={styles.cvPaper} id="cv-printable-area">
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.fullName}>{fullName || 'Your Full Name'}</h1>
          <div className={styles.jobTitle}>{jobTitle || 'Your Professional Title'}</div>
          <hr className={styles.divider} />
        </header>

        {/* Contact Information */}
        <div className={styles.sectionRow}>
          <div className={styles.sectionTitle}>CONTACT INFORMATION</div>
          <div className={styles.sectionContent}>
            <div className={styles.contactGrid}>
              {contact.email && (
                <div className={styles.contactLine}>
                  <span className={styles.contactLabel}>Email:</span>
                  <span className={styles.contactValue}>{contact.email}</span>
                </div>
              )}
              {contact.address && (
                <div className={styles.contactLine}>
                  <span className={styles.contactLabel}>Address:</span>
                  <span className={styles.contactValue}>{contact.address}</span>
                </div>
              )}
              {contact.phone && (
                <div className={styles.contactLine}>
                  <span className={styles.contactLabel}>Phone:</span>
                  <span className={styles.contactValue}>{contact.phone}</span>
                </div>
              )}
              {contact.linkedin && (
                <div className={styles.contactLine}>
                  <span className={styles.contactLabel}>LinkedIn:</span>
                  <span className={styles.contactValue}>{contact.linkedin}</span>
                </div>
              )}
              {contact.website && (
                <div className={styles.contactLine}>
                  <span className={styles.contactLabel}>Website:</span>
                  <span className={styles.contactValue}>{contact.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Objective */}
        {objective && (
          <div className={styles.sectionRow}>
            <div className={styles.sectionTitle}>OBJECTIVE</div>
            <div className={styles.sectionContent}>
              <p className={styles.objectiveText}>{objective}</p>
            </div>
          </div>
        )}

        {/* Experience */}
        {experiences.length > 0 && (
          <div className={styles.sectionRow}>
            <div className={styles.sectionTitle}>EXPERIENCE</div>
            <div className={styles.sectionContent}>
              <div className={styles.experienceList}>
                {experiences.map((exp) => (
                  <div key={exp.id} className={styles.experienceItem}>
                    <div className={styles.expPeriod}>{exp.period}</div>
                    <div className={styles.expDetails}>
                      <div className={styles.expRole}>{exp.role}</div>
                      <div className={styles.expCompany}>{exp.company}</div>

                      {exp.highlights && exp.highlights.length > 0 && (
                        <ul className={styles.bulletList}>
                          {exp.highlights.map((hl, i) => (
                            <li key={i} className={styles.bulletItem}>
                              {hl}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Sub-projects / Client Engagements inside Company */}
                      {exp.subProjects && exp.subProjects.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div className={styles.subProjectsLabel}>
                            Client Projects &amp; Engagements:
                          </div>
                          <div className={styles.subProjectsContainer}>
                            {exp.subProjects.map((sp) => (
                              <div key={sp.id} className={styles.subProjectItem}>
                                <div className={styles.subProjectHeader}>
                                  <div className={styles.subProjectTitle}>
                                    <strong>{sp.clientOrProject}</strong>
                                    {sp.role && (
                                      <span className={styles.subProjectRole}> — {sp.role}</span>
                                    )}
                                    {sp.period && (
                                      <span className={styles.subProjectPeriod}> ({sp.period})</span>
                                    )}
                                  </div>
                                </div>

                              {sp.highlights && sp.highlights.length > 0 && (
                                <ul className={styles.bulletList}>
                                  {sp.highlights.map((hl, idx) => (
                                    <li key={idx} className={styles.bulletItem}>
                                      {hl}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {(sp.technicalTools || sp.trackingTools || sp.developmentProcess) && (
                                <ul className={styles.envList}>
                                  {sp.technicalTools && (
                                    <li className={styles.bulletItem}>
                                      <strong>Technical tools:</strong> {sp.technicalTools}
                                    </li>
                                  )}
                                  {sp.trackingTools && (
                                    <li className={styles.bulletItem}>
                                      <strong>Tracking:</strong> {sp.trackingTools}
                                    </li>
                                  )}
                                  {sp.developmentProcess && (
                                    <li className={styles.bulletItem}>
                                      <strong>Process:</strong> {sp.developmentProcess}
                                    </li>
                                  )}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                      {exp.projectDetails && exp.projectDetails.length > 0 && (
                        <div>
                          <div className={styles.subHeading}>Project Details:</div>
                          <ul className={styles.bulletList}>
                            {exp.projectDetails.map((pd, i) => (
                              <li key={i} className={styles.bulletItem}>
                                {pd}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(exp.technicalTools || exp.trackingTools || exp.developmentProcess) && (
                        <div>
                          <div className={styles.subHeading}>Technical Environment :</div>
                          <ul className={styles.envList}>
                            {exp.technicalTools && (
                              <li className={styles.bulletItem}>
                                <strong>Technical tools:</strong> {exp.technicalTools}
                              </li>
                            )}
                            {exp.trackingTools && (
                              <li className={styles.bulletItem}>
                                <strong>Test case/Issue tracking tool:</strong> {exp.trackingTools}
                              </li>
                            )}
                            {exp.developmentProcess && (
                              <li className={styles.bulletItem}>
                                <strong>Development process:</strong> {exp.developmentProcess}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Education */}
        {educations.length > 0 && (
          <div className={styles.sectionRow}>
            <div className={styles.sectionTitle}>EDUCATION</div>
            <div className={styles.sectionContent}>
              <div className={styles.educationList}>
                {educations.map((edu) => (
                  <div key={edu.id} className={styles.educationItem}>
                    <div className={styles.eduPeriod}>{edu.period}</div>
                    <div className={styles.eduDetails}>
                      <div className={styles.eduDegree}>{edu.degree}</div>
                      <div className={styles.eduSchool}>{edu.school}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Achievements / Skills */}
        {((skills.primary && skills.primary.length > 0) || (skills.secondary && skills.secondary.length > 0)) && (
          <div className={styles.sectionRow}>
            <div className={styles.sectionTitle}>ACHIEVEMENTS</div>
            <div className={styles.sectionContent}>
              {skills.primary && skills.primary.length > 0 && (
                <div className={styles.skillBlock}>
                  <div className={styles.skillTitle}>Primary Skills:</div>
                  <ul className={styles.bulletList}>
                    {skills.primary.map((sk, i) => (
                      <li key={i} className={styles.bulletItem}>
                        {sk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {skills.secondary && skills.secondary.length > 0 && (
                <div className={styles.skillBlock}>
                  <div className={styles.skillTitle}>Secondary Skills:</div>
                  <ul className={styles.bulletList}>
                    {skills.secondary.map((sk, i) => (
                      <li key={i} className={styles.bulletItem}>
                        {sk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certifications & Courses */}
        {certifications && certifications.length > 0 && (
          <div className={styles.sectionRow}>
            <div className={styles.sectionTitle}>CERTIFICATIONS &amp; COURSES</div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                {certifications.map((cert, i) => (
                  <li key={i} className={styles.bulletItem}>
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

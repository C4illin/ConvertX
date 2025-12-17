import { Elysia } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import db from "../db/db";
import { Filename, Jobs } from "../db/types";
import { ALLOW_UNAUTHENTICATED, HIDE_HISTORY, LANGUAGE, TIMEZONE, WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { EyeIcon } from "../icons/eye";
import { DeleteIcon } from "../icons/delete";

export const history = new Elysia().use(userService).get(
  "/history",
  async ({ redirect, user }) => {
    if (HIDE_HISTORY) {
      return redirect(`${WEBROOT}/`, 302);
    }

    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    let userJobs = db.query("SELECT * FROM jobs WHERE user_id = ?").as(Jobs).all(user.id).reverse();

    for (const job of userJobs) {
      const files = db.query("SELECT * FROM file_names WHERE job_id = ?").as(Filename).all(job.id);

      job.finished_files = files.length;
      job.files_detailed = files;
    }

    // Filter out jobs with no files
    userJobs = userJobs.filter((job) => job.num_files > 0);

    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Results">
        <>
          <Header
            webroot={WEBROOT}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            hideHistory={HIDE_HISTORY}
            loggedIn
          />
          <main
            class={`
              w-full flex-1 px-2
              sm:px-4
            `}
          >
            <article class="article">
              <h1 class="mb-4 text-xl">Results</h1>
              <div id="delete-selected-container" class="mb-4 hidden">
                <button
                  id="delete-selected-btn"
                  class={`
                    rounded bg-red-600 px-4 py-2 text-white transition-colors
                    hover:bg-red-700
                  `}
                >
                  Delete Selected (<span id="selected-count">0</span>)
                </button>
              </div>
              <table
                class={`
                  w-full table-auto overflow-y-auto rounded bg-neutral-900 text-left
                  [&_td]:p-4
                  [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                `}
              >
                <thead>
                  <tr>
                    <th
                      class={`
                        px-2 py-2
                        sm:px-4
                      `}
                    >
                      <input
                        type="checkbox"
                        id="select-all"
                        class="h-4 w-4 cursor-pointer"
                        title="Select all"
                      />
                    </th>
                    <th
                      class={`
                        px-2 py-2
                        sm:px-4
                      `}
                    >
                      <span class="sr-only">Expand details</span>
                    </th>
                    <th
                      class={`
                        px-2 py-2
                        sm:px-4
                      `}
                    >
                      Time
                    </th>
                    <th
                      class={`
                        px-2 py-2
                        sm:px-4
                      `}
                    >
                      Files
                    </th>
                    <th
                      class={`
                        px-2 py-2
                        max-sm:hidden
                        sm:px-4
                      `}
                    >
                      Files Done
                    </th>
                    <th
                      class={`
                        px-2 py-2
                        sm:px-4
                      `}
                    >
                      Status
                    </th>
                    <th
                      class={`
                        px-2 py-2
                        sm:px-4
                      `}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userJobs.map((job) => (
                    <>
                      <tr id={`job-row-${job.id}`}>
                        <td>
                          <input
                            type="checkbox"
                            class="job-checkbox h-4 w-4 cursor-pointer"
                            data-job-id={job.id}
                          />
                        </td>
                        <td class="job-details-toggle cursor-pointer" data-job-id={job.id}>
                          <svg
                            id={`arrow-${job.id}`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="inline-block h-4 w-4"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </td>
                        <td safe>
                          {new Date(job.date_created).toLocaleTimeString(LANGUAGE, {
                            timeZone: TIMEZONE,
                          })}
                        </td>
                        <td>{job.num_files}</td>
                        <td class="max-sm:hidden">{job.finished_files}</td>
                        <td safe>{job.status}</td>
                        <td class="flex flex-row gap-4">
                          <a
                            class={`
                              text-accent-500 underline
                              hover:text-accent-400
                            `}
                            href={`${WEBROOT}/results/${job.id}`}
                          >
                            <EyeIcon />
                          </a>
                          <a
                            class={`
                              text-accent-500 underline
                              hover:text-accent-400
                            `}
                            href={`${WEBROOT}/delete/${job.id}`}
                          >
                            <DeleteIcon />
                          </a>
                        </td>
                      </tr>
                      <tr id={`details-${job.id}`} class="hidden">
                        <td colspan="7">
                          <div class="p-2 text-sm text-neutral-500">
                            <div class="mb-1 font-semibold">Detailed File Information:</div>
                            {job.files_detailed.map((file: Filename) => (
                              <div class="flex items-center">
                                <span class="w-5/12 truncate" title={file.file_name} safe>
                                  {file.file_name}
                                </span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  class={`mx-2 inline-block h-4 w-4 text-neutral-500`}
                                >
                                  <path
                                    fill-rule="evenodd"
                                    d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                                    clip-rule="evenodd"
                                  />
                                </svg>
                                <span class="w-5/12 truncate" title={file.output_file_name} safe>
                                  {file.output_file_name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </article>
          </main>
          <script>
            {`
              document.addEventListener('DOMContentLoaded', () => {
                // Expand/collapse job details
                const toggles = document.querySelectorAll('.job-details-toggle');
                toggles.forEach(toggle => {
                  toggle.addEventListener('click', function() {
                    const jobId = this.dataset.jobId;
                    const detailsRow = document.getElementById(\`details-\${jobId}\`);
                    const arrow = document.getElementById(\`arrow-\${jobId}\`);

                    if (detailsRow && arrow) {
                      detailsRow.classList.toggle("hidden");
                      if (detailsRow.classList.contains("hidden")) {
                        arrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />';
                      } else {
                        arrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />';
                      }
                    }
                  });
                });

                // Checkbox management
                const selectAllCheckbox = document.getElementById('select-all');
                const jobCheckboxes = document.querySelectorAll('.job-checkbox');
                const deleteSelectedBtn = document.getElementById('delete-selected-btn');
                const deleteSelectedContainer = document.getElementById('delete-selected-container');
                const selectedCountSpan = document.getElementById('selected-count');

                function updateDeleteButton() {
                  const checkedBoxes = Array.from(jobCheckboxes).filter(cb => cb.checked);
                  if (checkedBoxes.length > 0) {
                    deleteSelectedContainer.classList.remove('hidden');
                    selectedCountSpan.textContent = checkedBoxes.length;
                  } else {
                    deleteSelectedContainer.classList.add('hidden');
                  }
                }

                selectAllCheckbox?.addEventListener('change', function() {
                  jobCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                  });
                  updateDeleteButton();
                });

                jobCheckboxes.forEach(checkbox => {
                  checkbox.addEventListener('change', function() {
                    const allChecked = Array.from(jobCheckboxes).every(cb => cb.checked);
                    const someChecked = Array.from(jobCheckboxes).some(cb => cb.checked);
                    if (selectAllCheckbox) {
                      selectAllCheckbox.checked = allChecked;
                      selectAllCheckbox.indeterminate = someChecked && !allChecked;
                    }
                    updateDeleteButton();
                  });
                });

                deleteSelectedBtn?.addEventListener('click', async function() {
                  const checkedBoxes = Array.from(jobCheckboxes).filter(cb => cb.checked);
                  const jobIds = checkedBoxes.map(cb => cb.dataset.jobId);

                  if (jobIds.length === 0) return;

                  const confirmed = confirm(\`Are you sure you want to delete \${jobIds.length} job(s)? This action cannot be undone.\`);
                  if (!confirmed) return;

                  try {
                    const response = await fetch('${WEBROOT}/delete-multiple', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ jobIds }),
                    });

                    const result = await response.json();

                    if (result.success || result.deleted > 0) {
                      alert(\`Successfully deleted \${result.deleted} job(s).\${result.failed > 0 ? \` Failed to delete \${result.failed} job(s).\` : ''}\`);
                      window.location.reload();
                    } else {
                      alert('Failed to delete jobs. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error deleting jobs:', error);
                    alert('An error occurred while deleting jobs. Please try again.');
                  }
                });
              });
            `}
          </script>
        </>
      </BaseHtml>
    );
  },
  {
    auth: true,
  },
);

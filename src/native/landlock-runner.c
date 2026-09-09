#define _GNU_SOURCE
#include <linux/landlock.h>
#include <linux/prctl.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <stdbool.h>
#include <stdint.h>

#ifndef landlock_create_ruleset
static inline int landlock_create_ruleset(
    const struct landlock_ruleset_attr *const attr,
    const size_t size, const __u32 flags) {
    return syscall(__NR_landlock_create_ruleset, attr, size, flags);
}
#endif

#ifndef landlock_add_rule
static inline int landlock_add_rule(
    const int ruleset_fd, const enum landlock_rule_type rule_type,
    const void *const rule_attr, const __u32 flags) {
    return syscall(__NR_landlock_add_rule, ruleset_fd, rule_type, rule_attr, flags);
}
#endif

#ifndef landlock_restrict_self
static inline int landlock_restrict_self(
    const int ruleset_fd, const __u32 flags) {
    return syscall(__NR_landlock_restrict_self, ruleset_fd, flags);
}
#endif

#ifndef LANDLOCK_RULE_PATH_BENEATH
#define LANDLOCK_RULE_PATH_BENEATH 1
#endif

#ifndef LANDLOCK_ACCESS_FS_EXECUTE
#define LANDLOCK_ACCESS_FS_EXECUTE (1ULL << 0)
#define LANDLOCK_ACCESS_FS_WRITE_FILE (1ULL << 1)
#define LANDLOCK_ACCESS_FS_READ_FILE (1ULL << 2)
#define LANDLOCK_ACCESS_FS_READ_DIR (1ULL << 3)
#define LANDLOCK_ACCESS_FS_REMOVE_DIR (1ULL << 4)
#define LANDLOCK_ACCESS_FS_REMOVE_FILE (1ULL << 5)
#define LANDLOCK_ACCESS_FS_MAKE_CHAR (1ULL << 6)
#define LANDLOCK_ACCESS_FS_MAKE_DIR (1ULL << 7)
#define LANDLOCK_ACCESS_FS_MAKE_REG (1ULL << 8)
#define LANDLOCK_ACCESS_FS_MAKE_SOCK (1ULL << 9)
#define LANDLOCK_ACCESS_FS_MAKE_FIFO (1ULL << 10)
#define LANDLOCK_ACCESS_FS_MAKE_BLOCK (1ULL << 11)
#define LANDLOCK_ACCESS_FS_MAKE_SYM (1ULL << 12)
#endif

#ifndef LANDLOCK_ACCESS_FS_REFER
#define LANDLOCK_ACCESS_FS_REFER (1ULL << 13)
#endif
#ifndef LANDLOCK_ACCESS_FS_TRUNCATE
#define LANDLOCK_ACCESS_FS_TRUNCATE (1ULL << 14)
#endif
#ifndef LANDLOCK_ACCESS_FS_IOCTL_DEV
#define LANDLOCK_ACCESS_FS_IOCTL_DEV (1ULL << 15)
#endif

#ifndef LANDLOCK_ACCESS_NET_BIND_TCP
#define LANDLOCK_ACCESS_NET_BIND_TCP (1ULL << 0)
#define LANDLOCK_ACCESS_NET_CONNECT_TCP (1ULL << 1)
#endif

struct path_node {
    char *path;
    struct path_node *next;
};

static void add_node(struct path_node **head, const char *path) {
    if (!path || path[0] == '\0') return;
    struct path_node *node = malloc(sizeof(struct path_node));
    if (!node) return;
    node->path = strdup(path);
    node->next = *head;
    *head = node;
}

static void add_colon_separated(struct path_node **head, const char *path_list) {
    if (!path_list || path_list[0] == '\0') return;
    char *copy = strdup(path_list);
    if (!copy) return;
    char *saveptr = NULL;
    char *token = strtok_r(copy, ":", &saveptr);
    while (token != NULL) {
        if (strlen(token) > 0) {
            add_node(head, token);
        }
        token = strtok_r(NULL, ":", &saveptr);
    }
    free(copy);
}

static void free_nodes(struct path_node *head) {
    while (head) {
        struct path_node *next = head->next;
        free(head->path);
        free(head);
        head = next;
    }
}

static void add_path_rule(int ruleset_fd, const char *path, __u64 allowed_access, int abi) {
    if (!path || path[0] == '\0') return;

    int fd = open(path, O_PATH | O_CLOEXEC);
    if (fd < 0) {
        // Path does not exist or cannot be opened, ignore non-fatal missing paths
        return;
    }

    struct stat st;
    if (fstat(fd, &st) < 0) {
        close(fd);
        return;
    }

    __u64 access = allowed_access;
    if (!S_ISDIR(st.st_mode)) {
        // Character devices, regular files, sockets, etc. cannot take directory-only access flags
        __u64 file_mask = LANDLOCK_ACCESS_FS_EXECUTE |
                          LANDLOCK_ACCESS_FS_READ_FILE |
                          LANDLOCK_ACCESS_FS_WRITE_FILE;
        if (abi >= 2) file_mask |= LANDLOCK_ACCESS_FS_REFER;
        if (abi >= 3) file_mask |= LANDLOCK_ACCESS_FS_TRUNCATE;
        if (abi >= 5) file_mask |= LANDLOCK_ACCESS_FS_IOCTL_DEV;
        access &= file_mask;
    }

    struct landlock_path_beneath_attr path_beneath = {
        .parent_fd = fd,
        .allowed_access = access,
    };

    landlock_add_rule(ruleset_fd, LANDLOCK_RULE_PATH_BENEATH, &path_beneath, 0);
    close(fd);
}

static void print_usage(const char *prog) {
    fprintf(stderr,
        "Usage: %s [options] -- <command> [args...]\n\n"
        "Options:\n"
        "  --ro <paths>    Colon-separated list of read-only paths (can be repeated)\n"
        "  --rw <paths>    Colon-separated list of read-write paths (can be repeated)\n"
        "  --no-net        Disable all network operations (TCP connect & bind)\n"
        "  --strict        Fail if Landlock is unsupported instead of falling back\n"
        "  --version       Print Landlock ABI version and exit\n"
        "  --help          Print this help message\n",
        prog);
}

int main(int argc, char *argv[]) {
    struct path_node *ro_head = NULL;
    struct path_node *rw_head = NULL;
    bool no_net = false;
    bool strict = false;
    int cmd_idx = -1;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--") == 0) {
            cmd_idx = i + 1;
            break;
        } else if (strcmp(argv[i], "--version") == 0) {
            int abi = landlock_create_ruleset(NULL, 0, LANDLOCK_CREATE_RULESET_VERSION);
            if (abi < 0) {
                printf("Landlock unsupported (%s)\n", strerror(errno));
                return 1;
            }
            printf("Landlock ABI v%d\n", abi);
            return 0;
        } else if (strcmp(argv[i], "--help") == 0) {
            print_usage(argv[0]);
            return 0;
        } else if (strcmp(argv[i], "--ro") == 0) {
            if (++i >= argc) {
                fprintf(stderr, "landlock-runner: --ro requires an argument\n");
                return 1;
            }
            add_colon_separated(&ro_head, argv[i]);
        } else if (strcmp(argv[i], "--rw") == 0) {
            if (++i >= argc) {
                fprintf(stderr, "landlock-runner: --rw requires an argument\n");
                return 1;
            }
            add_colon_separated(&rw_head, argv[i]);
        } else if (strcmp(argv[i], "--no-net") == 0) {
            no_net = true;
        } else if (strcmp(argv[i], "--strict") == 0) {
            strict = true;
        } else {
            fprintf(stderr, "landlock-runner: unrecognized option '%s'\n", argv[i]);
            print_usage(argv[0]);
            return 1;
        }
    }

    if (cmd_idx < 0 || cmd_idx >= argc) {
        fprintf(stderr, "landlock-runner: no command specified after '--'\n");
        free_nodes(ro_head);
        free_nodes(rw_head);
        return 1;
    }

    // Query Landlock ABI version
    int abi = landlock_create_ruleset(NULL, 0, LANDLOCK_CREATE_RULESET_VERSION);
    if (abi < 1) {
        free_nodes(ro_head);
        free_nodes(rw_head);
        if (strict) {
            fprintf(stderr, "landlock-runner error: Landlock LSM is not supported or disabled on this kernel (errno=%d: %s)\n",
                    errno, strerror(errno));
            return 1;
        }
        // Fallback: run command without Landlock
        execvp(argv[cmd_idx], &argv[cmd_idx]);
        perror("landlock-runner: execvp");
        return 127;
    }

    // Handled filesystem access rights in ruleset
    __u64 handled_fs_access = LANDLOCK_ACCESS_FS_EXECUTE |
                              LANDLOCK_ACCESS_FS_READ_FILE |
                              LANDLOCK_ACCESS_FS_READ_DIR |
                              LANDLOCK_ACCESS_FS_WRITE_FILE |
                              LANDLOCK_ACCESS_FS_REMOVE_DIR |
                              LANDLOCK_ACCESS_FS_REMOVE_FILE |
                              LANDLOCK_ACCESS_FS_MAKE_CHAR |
                              LANDLOCK_ACCESS_FS_MAKE_DIR |
                              LANDLOCK_ACCESS_FS_MAKE_REG |
                              LANDLOCK_ACCESS_FS_MAKE_SOCK |
                              LANDLOCK_ACCESS_FS_MAKE_FIFO |
                              LANDLOCK_ACCESS_FS_MAKE_BLOCK |
                              LANDLOCK_ACCESS_FS_MAKE_SYM;
    if (abi >= 2) handled_fs_access |= LANDLOCK_ACCESS_FS_REFER;
    if (abi >= 3) handled_fs_access |= LANDLOCK_ACCESS_FS_TRUNCATE;
    if (abi >= 5) handled_fs_access |= LANDLOCK_ACCESS_FS_IOCTL_DEV;

    // Build supported filesystem access rights for read-only paths
    __u64 fs_ro_access = LANDLOCK_ACCESS_FS_EXECUTE |
                         LANDLOCK_ACCESS_FS_READ_FILE |
                         LANDLOCK_ACCESS_FS_READ_DIR;
    if (abi >= 2) fs_ro_access |= LANDLOCK_ACCESS_FS_REFER;

    // Build supported filesystem access rights for read-write paths
    // NOTE: Intentionally exclude LANDLOCK_ACCESS_FS_MAKE_SYM, MAKE_CHAR, MAKE_BLOCK, MAKE_FIFO
    // to prevent creation of symlinks (CWE-59 sandbox escape) and device nodes.
    __u64 fs_rw_access = fs_ro_access |
                         LANDLOCK_ACCESS_FS_WRITE_FILE |
                         LANDLOCK_ACCESS_FS_REMOVE_DIR |
                         LANDLOCK_ACCESS_FS_REMOVE_FILE |
                         LANDLOCK_ACCESS_FS_MAKE_DIR |
                         LANDLOCK_ACCESS_FS_MAKE_REG |
                         LANDLOCK_ACCESS_FS_MAKE_SOCK;
    if (abi >= 3) fs_rw_access |= LANDLOCK_ACCESS_FS_TRUNCATE;
    if (abi >= 5) fs_rw_access |= LANDLOCK_ACCESS_FS_IOCTL_DEV;

    struct landlock_ruleset_attr attr = {
        .handled_access_fs = handled_fs_access,
    };

    if (no_net && abi >= 4) {
        attr.handled_access_net = LANDLOCK_ACCESS_NET_BIND_TCP | LANDLOCK_ACCESS_NET_CONNECT_TCP;
    }

    int ruleset_fd = landlock_create_ruleset(&attr, sizeof(attr), 0);
    if (ruleset_fd < 0) {
        free_nodes(ro_head);
        free_nodes(rw_head);
        if (strict) {
            fprintf(stderr, "landlock-runner error: failed to create ruleset: %s\n", strerror(errno));
            return 1;
        }
        execvp(argv[cmd_idx], &argv[cmd_idx]);
        perror("landlock-runner: execvp");
        return 127;
    }

    // Add read-only paths
    for (struct path_node *curr = ro_head; curr; curr = curr->next) {
        add_path_rule(ruleset_fd, curr->path, fs_ro_access, abi);
    }
    free_nodes(ro_head);

    // Add read-write paths
    for (struct path_node *curr = rw_head; curr; curr = curr->next) {
        add_path_rule(ruleset_fd, curr->path, fs_rw_access, abi);
    }
    free_nodes(rw_head);

    // Prevent processes from gaining new privileges
    if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) < 0) {
        if (strict) {
            perror("landlock-runner: prctl(PR_SET_NO_NEW_PRIVS)");
            close(ruleset_fd);
            return 1;
        }
    }

    // Apply the Landlock sandbox to the current process and all future children
    if (landlock_restrict_self(ruleset_fd, 0) < 0) {
        if (strict) {
            perror("landlock-runner: landlock_restrict_self");
            close(ruleset_fd);
            return 1;
        }
    }

    close(ruleset_fd);

    // Execute the target program
    execvp(argv[cmd_idx], &argv[cmd_idx]);
    perror("landlock-runner: execvp");
    return 127;
}


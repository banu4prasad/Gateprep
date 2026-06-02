# Docker Frontend Build Failure
**Issue:** The frontend Dockerfile fails to build on some systems with an `overlayfs` error.
**Root Cause:** Intermittent Docker/BuildKit bug with specific overlayfs combinations, often seen with complex multi-stage builds or missing dependencies.
**Suggested Fix:** Simplify the `Dockerfile` or update Docker on the host. Since this is an environment issue, no patch is provided.

**Evidence**:

```
#14 [frontend builder 2/6] WORKDIR /app
#14 ERROR: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1121585559", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/31/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/31/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/30/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/28/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/25/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1/fs,index=off,redirect_dir=off", err: invalid argument
------
 > [frontend builder 2/6] WORKDIR /app:
------
target frontend: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1121585559", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/31/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/31/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/30/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/28/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/25/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1/fs,index=off,redirect_dir=off", err: invalid argument
```

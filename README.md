### Configuring default settings

The most common settings you'll use are `PUBLIC_INSTANCE_URL`. Some selfhosters with `PUBLIC_SSR_ENABLED` set to true might want the instance url to be different for the server. You can use the `PUBLIC_INTERNAL_INSTANCE` variable for that.

`PUBLIC_MIGRATE_COOKIE` is useful if you want to switch Photon to your default frontend. It'll convert the logged in cookie from lemmy-ui to a Photon account. It will only work if you have `PUBLIC_INSTANCE_URL` set, and it will login with that instance.

`PUBLIC_SSR_ENABLED` will have the initial load be rendered by the server, before the client router is loaded. This can lead to a faster feeling load initally, and will allow your instance to be better indexed by search bots, and allow users with JavaScript disabled to view Photon with a basic view.

These are the most important environment variables that you can change:

| Variable                    | Values              | Default Value                          |
| --------------------------- | ------------------- | -------------------------------------- |
| PUBLIC_INSTANCE_URL         | URL                 | `lemmy.ml`                             |
| PUBLIC_INTERNAL_INSTANCE    | URL                 | Value of `PUBLIC_INSTANCE_URL`         |
| PUBLIC_LOCK_TO_INSTANCE     | `bool`              | `true` if `PUBLIC_INSTANCE_URL` is set |
| PUBLIC_FAVICON              | URL                 | `/img/logo-background.svg              |
| PUBLIC_SSR_ENABLED          | `bool`              | `false`                                |
| PUBLIC_MIGRATE_COOKIE       | `bool`              | `false`                                |
| PUBLIC_THEME                | JSON                | Photon's default colors                |
| PUBLIC_COLORSCHEME          | system\|dark\|light | system                                 |
| PUBLIC_EXPANDABLE_IMAGES    | `bool`              | true                                   |
| PUBLIC_MARK_READ_POSTS      | `bool`              | true                                   |
| PUBLIC_DEFAULT_FEED_SORT    | `SortType`          | Active                                 |
| PUBLIC_DEFAULT_FEED         | `ListingType`       | All                                    |
| PUBLIC_DEFAULT_COMMENT_SORT | `CommentSortType`   | Hot                                    |
| PUBLIC_HIDE_DELETED         | `bool`              | true                                   |
| PUBLIC_HIDE_REMOVED         | `bool`              | true                                   |
| PUBLIC_NSFW_BLUR            | `bool`              | true                                   |
| PUBLIC_RANDOM_PLACEHOLDERS  | `bool`              | true                                   |
| PUBLIC_REMOVE_CREDIT        | `bool`              | false                                  |

There are more options available that you can see at `src/lib/settings.ts`, by looking at the `defaultSettings` object.

The values for `SortType`, `ListingType`, and `CommentSortType` are defined by the lemmy-js-client library.

#### Listing Type

https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/ListingType.ts

- All
- Local
- Subscribed
- Moderator

#### Sort Type

(case sensitive)

https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/SortType.ts

- Active
- Hot
- New
- Old
- TopDay
- TopWeek
- TopMonth
- TopAll
- MostComments
- NewComments
- TopHour
- TopSixHour
- TopTwelveHour
- TopThreeMonths
- TopSixMonths
- TopNineMonths
- TopYear

#### Comment Sort Type

https://github.com/LemmyNet/lemmy-js-client/blob/main/src/types/CommentSortType.ts
values:

- Hot
- Top
- New
- Old
- Controversial

# Photon (Fork)

Photon is a modern client for the Fediverse, written in Svelte. This fork was created for further development and experimentation. This project is based on [Photon](https://github.com/Xyphyn/photon) by [Xyphyn](https://github.com/Xyphyn), distributed under the AGPL-3.0 license.

## License

This project is licensed under **AGPL-3.0**. For more details, see the [LICENSE](./LICENSE) file.


# Build and Deploy

### Local Build

Build and run the image locally:
```bash
docker compose build
docker compose up -d
```

### Build and Push to External Registry

If you have a container registry, you can push the built image there:
```bash
docker build -t <registry>/rabotaem:latest .
docker push <registry>/rabotaem:latest
```

On the production server, update `docker-compose.yml` by replacing the `build` section with:
```yaml
image: <registry>/rabotaem:latest
```

### Deploy via SSH Without Registry

If there is no container registry, you can build an archive of the image and transfer it via SSH:
```bash
# Build image
docker build -t rabotaem:latest .

# Save as tar
docker save rabotaem:latest | gzip > rabotaem.tar.gz

# Copy to server with scp
scp rabotaem.tar.gz user@host:/tmp/
```

On the server, load and start:
```bash
gunzip -c /tmp/rabotaem.tar.gz | docker load
docker compose up -d
```

function renderUsername(user) {
    return <span>{user.display_name ? user.display_name : user.username}</span>;
}
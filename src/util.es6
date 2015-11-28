export default function safeMatch(str, re) {
    const match = str.match(re);

    if (match) {
        return match[1];
    } else {
        return null;
    }
}

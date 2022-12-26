export interface DbUser {
    id: number,
    user_id: string,
    email?: string,
    name: string
}

export interface DbChannel {
    id: number,
    channel_id: string,
    server: number,
    name: string
}

export interface DbServer {
    id: number,
    server_id: string,
    name: string
}

export interface DbMeme {
    msg_id: string,
    author: number,
    early: boolean,
    date_created: string,
    channel: number,
    id: number
}

export interface FtbSum {
    user_id: string,
    ftbPoints: number
}

export interface UpvotesReceived {
    user_id: string,
    upvotes_received: number
}

export interface UpvotesGiven {
    user_id: string,
    upvotes_given: number
}

export interface MemeStats {
    user_id: string,
    memes_posted: number,
    memes_archived: number,
    memes_rejected: number,
    avg_upvotes: number
}
export default class AIleanaError extends Error{ 
    constructor(message: string) { 
        super(message)
    }
}

export const EMAIL_ALREADY_EXIST = "Email already exist";
export const INVALID_DETAILS_PROVIDED = "Invalid details provided"
export const NO_SESSION_FOUND = "Not logged in";
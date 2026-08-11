import "dotenv/config";
export declare const appConfig: {
    readonly nodeEnv: "development" | "test" | "production";
    readonly port: number;
    readonly frontendUrl: string;
    readonly backendPublicUrl: string;
    readonly redisUrl: string;
    readonly jwtSecret: string;
    readonly jwtExpiresIn: string;
    readonly authCookieName: string;
    readonly authCookieMaxAgeMs: number;
    readonly database: {
        readonly host: string;
        readonly port: number;
        readonly name: string;
        readonly user: string;
        readonly password: string;
        readonly socket: string;
    };
};
export type AppConfig = typeof appConfig;

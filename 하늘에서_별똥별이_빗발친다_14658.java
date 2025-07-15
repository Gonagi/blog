import java.io.*;
import java.util.*;

public class Main {
    static class Node {
        int x, y;

        public Node(int x, int y) {
            this.x = x;
            this.y = y;
        }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(System.out));

        StringTokenizer st = new StringTokenizer(br.readLine());
        st.nextToken();
        st.nextToken();
        int L = Integer.parseInt(st.nextToken());
        int K = Integer.parseInt(st.nextToken());
        Node[] stars = new Node[K];

        for (int idx = 0; idx < K; idx++) {
            st = new StringTokenizer(br.readLine());
            int x = Integer.parseInt(st.nextToken());
            int y = Integer.parseInt(st.nextToken());
            stars[idx] = new Node(x, y);
        }

        int result = Integer.MAX_VALUE;

        for (int idx = 0; idx < K; idx++) {
            for (int idx2 = 0; idx2 < K; idx2++) {
                int startX = stars[idx].x;
                int startY = stars[idx2].y;

                int count = 0;
                for (int idx3 = 0; idx3 < K; idx3++) {
                    int x = stars[idx3].x;
                    int y = stars[idx3].y;
                    if (startX <= x && x <= startX + L &&
                            startY <= y && y <= startY + L) {
                        count++;
                    }
                }

                result = Math.min(result, (K - count));
            }
        }

        bw.write(result + "\n");
        bw.flush();
        br.close();
        bw.close();
    }
}

